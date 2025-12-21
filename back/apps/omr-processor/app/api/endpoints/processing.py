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

        # Log formatted answers table
        logger.info("=" * 70)
        logger.info(f"ANSWER KEY PROCESADO - Examen: {exam_id}")
        logger.info("=" * 70)
        
        # Create formatted table output
        answers_per_row = 10  # Show 10 answers per row
        for row_start in range(0, len(result.answers), answers_per_row):
            row_end = min(row_start + answers_per_row, len(result.answers))
            row_items = []
            for answer in result.answers[row_start:row_end]:
                label = answer.selected_option_label or "-"
                row_items.append(f"{answer.question_number:2d}:{label}")
            logger.info(" | ".join(row_items))
        
        logger.info("=" * 70)
        logger.info(
            f"Total: {len(result.answers)} respuestas | "
            f"Confidence: {result.confidence_score:.2%} | "
            f"Time: {processing_time}ms"
        )
        logger.info("=" * 70)

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


@router.post("/debug-detection")
async def debug_detection(
    file: UploadFile = File(...),
    total_questions: int = Form(90),
    options_per_question: int = Form(5),
):
    """
    Debug endpoint: processes image and saves debug images to see what's being detected.
    Returns paths to saved debug images.
    """
    import cv2
    import numpy as np
    import os
    from datetime import datetime
    
    logger.info("Debug detection started")
    
    # Create debug output directory
    debug_dir = os.path.join(os.path.dirname(__file__), "..", "..", "debug_output")
    os.makedirs(debug_dir, exist_ok=True)
    
    # Read image
    image_data = await file.read()
    np_array = np.frombuffer(image_data, np.uint8)
    original = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    
    if original is None:
        raise HTTPException(status_code=400, detail="Failed to decode image")
    
    h, w = original.shape[:2]
    logger.info(f"Original image: {w}x{h}")
    
    # Save original
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_path = os.path.join(debug_dir, f"1_original_{timestamp}.jpg")
    cv2.imwrite(original_path, original)
    
    # Crop to right side - CALIBRATION v8
    x_start = int(w * 0.505)
    x_end = int(w * 0.83)
    y_start = int(h * 0.045)
    y_end = int(h * 0.98)
    cropped = original[y_start:y_end, x_start:x_end]
    
    cropped_path = os.path.join(debug_dir, f"2_cropped_{timestamp}.jpg")
    cv2.imwrite(cropped_path, cropped)
    
    # Gray and threshold
    gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    binary_path = os.path.join(debug_dir, f"3_binary_{timestamp}.jpg")
    cv2.imwrite(binary_path, binary)
    
    # Draw grid overlay on cropped
    ch, cw = cropped.shape[:2]
    grid_overlay = cropped.copy()
    
    num_cols = 3
    rows_per_col = 30
    col_width = cw / num_cols
    row_height = ch / rows_per_col
    
    # Draw column lines
    for i in range(1, num_cols):
        x = int(i * col_width)
        cv2.line(grid_overlay, (x, 0), (x, ch), (0, 255, 0), 2)
    
    # Draw row lines
    for i in range(1, rows_per_col):
        y = int(i * row_height)
        cv2.line(grid_overlay, (0, y), (cw, y), (0, 255, 0), 1)
    
    # Draw bubble positions - CALIBRATION v8
    bubble_area_start = 0.14
    bubble_area_end = 0.96
    
    for q_num in range(1, total_questions + 1):
        col_idx = (q_num - 1) // rows_per_col
        row_idx = (q_num - 1) % rows_per_col
        
        y_center = int((row_idx + 0.5) * row_height)
        x_col_start = int(col_idx * col_width)
        bubble_start = x_col_start + int(col_width * bubble_area_start)
        bubble_end = x_col_start + int(col_width * bubble_area_end)
        bubble_width = (bubble_end - bubble_start) / options_per_question
        
        for opt_idx in range(options_per_question):
            x_center = int(bubble_start + (opt_idx + 0.5) * bubble_width)
            cv2.circle(grid_overlay, (x_center, y_center), int(bubble_width * 0.3), (255, 0, 0), 1)
    
    grid_path = os.path.join(debug_dir, f"4_grid_overlay_{timestamp}.jpg")
    cv2.imwrite(grid_path, grid_overlay)
    
    logger.info(f"Debug images saved to: {debug_dir}")
    
    return {
        "message": "Debug images saved",
        "debug_dir": debug_dir,
        "files": [
            original_path,
            cropped_path,
            binary_path,
            grid_path,
        ],
        "cropped_size": f"{cw}x{ch}",
        "grid_config": {
            "num_cols": num_cols,
            "rows_per_col": rows_per_col,
            "col_width": col_width,
            "row_height": row_height,
        }
    }


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
