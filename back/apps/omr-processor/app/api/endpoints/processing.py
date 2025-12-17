"""OMR Processing endpoints."""

import time
from typing import Optional

import structlog
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.core.constants import ProcessingStatus
from app.schemas.processing import (
    ProcessingRequest,
    ProcessingResponse,
    DetectedAnswer,
    ImageValidationResult,
)
from app.services.omr_processor import OMRProcessor
from app.services.image_validator import ImageValidator

router = APIRouter()
logger = structlog.get_logger()


@router.post("/answer-key", response_model=ProcessingResponse)
async def process_answer_key(
    file: UploadFile = File(...),
    exam_id: str = Form(...),
    total_questions: int = Form(...),
    options_per_question: int = Form(5),
) -> ProcessingResponse:
    """
    Process an answer key image and detect correct answers.
    
    - **file**: Answer key image (JPEG, PNG, TIFF)
    - **exam_id**: UUID of the exam
    - **total_questions**: Total number of questions
    - **options_per_question**: Number of options per question (default: 5)
    """
    start_time = time.time()
    logger.info(
        "Processing answer key",
        exam_id=exam_id,
        total_questions=total_questions,
        filename=file.filename,
    )

    try:
        # Read image data
        image_data = await file.read()

        # Validate image
        validator = ImageValidator()
        validation = validator.validate(image_data)

        if not validation.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "Image validation failed",
                    "errors": validation.errors,
                },
            )

        # Process OMR
        processor = OMRProcessor()
        result = processor.process_image(
            image_data=image_data,
            total_questions=total_questions,
            options_per_question=options_per_question,
        )

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            "Answer key processed successfully",
            exam_id=exam_id,
            detected_answers=len(result.answers),
            confidence=result.confidence_score,
            processing_time_ms=processing_time,
        )

        return ProcessingResponse(
            success=True,
            status=ProcessingStatus.COMPLETED,
            detected_answers=result.answers,
            confidence_score=result.confidence_score,
            quality_score=validation.quality_score,
            quality_level=validation.quality_level,
            processing_time_ms=processing_time,
            warnings=result.warnings,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error processing answer key", exam_id=exam_id, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PROCESSING_ERROR",
                "message": f"Failed to process answer key: {str(e)}",
            },
        )


@router.post("/student-answer", response_model=ProcessingResponse)
async def process_student_answer(
    file: UploadFile = File(...),
    exam_id: str = Form(...),
    student_id: str = Form(...),
    attempt_id: str = Form(...),
    total_questions: int = Form(...),
    options_per_question: int = Form(5),
) -> ProcessingResponse:
    """
    Process a student answer sheet image.
    
    - **file**: Student answer sheet image (JPEG, PNG, TIFF)
    - **exam_id**: UUID of the exam
    - **student_id**: UUID of the student
    - **attempt_id**: UUID of the exam attempt
    - **total_questions**: Total number of questions
    - **options_per_question**: Number of options per question (default: 5)
    """
    start_time = time.time()
    logger.info(
        "Processing student answer",
        exam_id=exam_id,
        student_id=student_id,
        attempt_id=attempt_id,
        filename=file.filename,
    )

    try:
        # Read image data
        image_data = await file.read()

        # Validate image
        validator = ImageValidator()
        validation = validator.validate(image_data)

        if not validation.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "Image validation failed",
                    "errors": validation.errors,
                },
            )

        # Process OMR
        processor = OMRProcessor()
        result = processor.process_image(
            image_data=image_data,
            total_questions=total_questions,
            options_per_question=options_per_question,
        )

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            "Student answer processed successfully",
            exam_id=exam_id,
            student_id=student_id,
            attempt_id=attempt_id,
            detected_answers=len(result.answers),
            confidence=result.confidence_score,
            processing_time_ms=processing_time,
        )

        return ProcessingResponse(
            success=True,
            status=ProcessingStatus.COMPLETED,
            detected_answers=result.answers,
            confidence_score=result.confidence_score,
            quality_score=validation.quality_score,
            quality_level=validation.quality_level,
            processing_time_ms=processing_time,
            warnings=result.warnings,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(
            "Error processing student answer",
            exam_id=exam_id,
            student_id=student_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "PROCESSING_ERROR",
                "message": f"Failed to process student answer: {str(e)}",
            },
        )


@router.post("/validate-image", response_model=ImageValidationResult)
async def validate_image(file: UploadFile = File(...)) -> ImageValidationResult:
    """
    Validate an image for OMR processing.
    
    - **file**: Image to validate (JPEG, PNG, TIFF)
    """
    try:
        image_data = await file.read()
        validator = ImageValidator()
        return validator.validate(image_data)
    except Exception as e:
        logger.exception("Error validating image", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "VALIDATION_ERROR", "message": str(e)},
        )
