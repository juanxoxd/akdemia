"""
RabbitMQ Consumer for OMR Processing Queue

Escucha la cola omr.processing y procesa las respuestas de estudiantes.
Publica los resultados en omr.results.
"""

import json
import asyncio
from typing import Optional
import aio_pika
from aio_pika import IncomingMessage
import structlog

from app.core.config import settings
from app.services.omr_processor import OMRProcessor
from app.services.image_validator import ImageValidator
from app.core.constants import ProcessingStatus, AnswerStatus

logger = structlog.get_logger(__name__)


class ProcessingConsumer:
    """Consumer que procesa mensajes de la cola omr.processing"""
    
    def __init__(self):
        self.connection: Optional[aio_pika.Connection] = None
        self.channel: Optional[aio_pika.Channel] = None
        self.omr_processor = OMRProcessor()
        self.image_validator = ImageValidator()
        
    async def connect(self) -> None:
        """Conectar a RabbitMQ"""
        try:
            self.connection = await aio_pika.connect_robust(
                settings.RABBITMQ_URL,
                loop=asyncio.get_event_loop()
            )
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=1)
            
            logger.info(
                "Conectado a RabbitMQ",
                queue_processing="omr.processing",
                queue_results="omr.results"
            )
        except Exception as e:
            logger.error("Error conectando a RabbitMQ", error=str(e))
            raise
    
    async def start_consuming(self) -> None:
        """Iniciar consumo de mensajes"""
        if not self.channel:
            await self.connect()
        
        # Declarar colas
        processing_queue = await self.channel.declare_queue(
            "omr.processing",
            durable=True
        )
        
        await self.channel.declare_queue(
            "omr.results",
            durable=True
        )
        
        logger.info("Iniciando consumo de cola omr.processing")
        
        async with processing_queue.iterator() as queue_iter:
            async for message in queue_iter:
                await self.process_message(message)
    
    async def process_message(self, message: IncomingMessage) -> None:
        """Procesar un mensaje de la cola"""
        async with message.process():
            try:
                raw_body = json.loads(message.body.decode())
                
                # NestJS microservices envía mensajes con formato: { pattern: "...", data: {...} }
                # Extraer los datos reales del campo 'data' si existe
                if "data" in raw_body and isinstance(raw_body.get("data"), dict):
                    body = raw_body["data"]
                    logger.info(
                        "Mensaje NestJS recibido",
                        pattern=raw_body.get("pattern"),
                        attempt_id=body.get("attemptId"),
                        exam_id=body.get("examId"),
                        student_id=body.get("studentId")
                    )
                else:
                    # Fallback: mensaje directo sin wrapper de NestJS
                    body = raw_body
                    logger.info(
                        "Mensaje directo recibido",
                        attempt_id=body.get("attemptId"),
                        exam_id=body.get("examId"),
                        student_id=body.get("studentId")
                    )
                
                # Validar que el mensaje tenga los campos requeridos
                if not body.get("attemptId"):
                    logger.error(
                        "Mensaje recibido sin attemptId válido, descartando",
                        raw_body=str(raw_body)[:500]
                    )
                    return  # Descartar mensaje inválido
                
                # Procesar la imagen
                result = await self.process_student_answer(body)
                
                # Publicar resultado
                await self.publish_result(result)
                
                logger.info(
                    "Mensaje procesado exitosamente",
                    attempt_id=body.get("attemptId"),
                    success=result.get("success")
                )
                
            except Exception as e:
                logger.error(
                    "Error procesando mensaje",
                    error=str(e),
                    message_body=message.body.decode()[:200]
                )
                # El mensaje se rechaza y reencola automáticamente
                raise
    
    async def process_student_answer(self, data: dict) -> dict:
        """
        Procesar respuesta de estudiante usando el OMRProcessor real
        
        Args:
            data: Mensaje con imageUrl, answerKey, etc.
            
        Returns:
            Resultado del procesamiento
        """
        attempt_id = data.get("attemptId")
        exam_id = data.get("examId")
        student_id = data.get("studentId")
        image_url = data.get("imageUrl")
        answer_key = data.get("answerKey", [])
        total_questions = data.get("totalQuestions", 100)
        options_per_question = data.get("optionsPerQuestion", 5)
        
        try:
            logger.info(
                "Procesando imagen con OMR real",
                attempt_id=attempt_id,
                image_url=image_url,
                total_questions=total_questions
            )
            
            # 1. Descargar imagen desde la URL (MinIO/S3)
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                image_data = response.content
            
            logger.info(
                "Imagen descargada",
                attempt_id=attempt_id,
                size_bytes=len(image_data)
            )
            
            # 2. Procesar imagen con OMRProcessor
            omr_result = self.omr_processor.process_image(
                image_data=image_data,
                total_questions=total_questions,
                options_per_question=options_per_question
            )
            
            # 3. Comparar con answer_key y calcular score
            detected_answers = []
            correct_count = 0
            incorrect_count = 0
            blank_count = 0
            
            for answer in omr_result.answers:
                q_num = answer.question_number
                selected = answer.selected_option
                
                # Obtener respuesta correcta del answer_key
                # answer_key es una lista de listas: [[0], [3], [4], ...]
                # donde cada sublista contiene la opción correcta (0-indexed)
                correct = None
                if q_num <= len(answer_key) and answer_key[q_num - 1]:
                    correct = answer_key[q_num - 1][0] if isinstance(answer_key[q_num - 1], list) else answer_key[q_num - 1]
                
                # Determinar si es correcto
                is_correct = False
                if selected is not None and correct is not None:
                    is_correct = selected == correct
                
                # Contabilizar
                if answer.status == AnswerStatus.BLANK or selected is None:
                    blank_count += 1
                elif is_correct:
                    correct_count += 1
                else:
                    incorrect_count += 1
                
                detected_answers.append({
                    "questionNumber": q_num,
                    "selectedOption": selected,
                    "correctOption": correct,
                    "isCorrect": is_correct,
                    "status": answer.status.value if hasattr(answer.status, 'value') else str(answer.status),
                    "confidenceScore": answer.confidence_score
                })
            
            score = correct_count
            percentage = round((correct_count / total_questions) * 100, 2) if total_questions > 0 else 0
            
            logger.info(
                "Procesamiento completado",
                attempt_id=attempt_id,
                score=score,
                total_questions=total_questions,
                correct=correct_count,
                incorrect=incorrect_count,
                blank=blank_count,
                confidence=omr_result.confidence_score
            )
            
            return {
                "attemptId": attempt_id,
                "examId": exam_id,
                "studentId": student_id,
                "success": True,
                "score": score,
                "totalCorrect": correct_count,
                "totalIncorrect": incorrect_count,
                "totalBlank": blank_count,
                "totalQuestions": total_questions,
                "percentage": percentage,
                "confidenceScore": omr_result.confidence_score,
                "answers": detected_answers,
                "processedAt": self._get_timestamp()
            }
            
        except Exception as e:
            logger.error(
                "Error procesando respuesta de estudiante",
                attempt_id=attempt_id,
                error=str(e)
            )
            return {
                "attemptId": attempt_id,
                "examId": exam_id,
                "studentId": student_id,
                "success": False,
                "error": {
                    "code": "PROCESSING_ERROR",
                    "message": str(e)
                },
                "processedAt": self._get_timestamp()
            }
    
    async def publish_result(self, result: dict) -> None:
        """Publicar resultado en cola omr.results"""
        if not self.channel:
            raise RuntimeError("No hay conexión a RabbitMQ")
        
        message = aio_pika.Message(
            body=json.dumps(result).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT
        )
        
        await self.channel.default_exchange.publish(
            message,
            routing_key="omr.results"
        )
        
        logger.info(
            "Resultado publicado",
            attempt_id=result.get("attemptId"),
            queue="omr.results"
        )
    
    def _get_timestamp(self) -> str:
        """Obtener timestamp ISO"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()
    
    async def close(self) -> None:
        """Cerrar conexión"""
        if self.connection:
            await self.connection.close()
            logger.info("Desconectado de RabbitMQ")


# Script para ejecutar el consumer independientemente
async def main():
    """Ejecutar consumer"""
    consumer = ProcessingConsumer()
    
    try:
        await consumer.connect()
        await consumer.start_consuming()
    except KeyboardInterrupt:
        logger.info("Consumer detenido por usuario")
    finally:
        await consumer.close()


if __name__ == "__main__":
    asyncio.run(main())
