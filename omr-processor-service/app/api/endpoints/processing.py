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
            logger.warning(
                "Image validation failed",
                exam_id=exam_id,
                filename=file.filename,
                width=validation.width,
                height=validation.height,
                errors=validation.errors,
                warnings=validation.warnings,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "VALIDATION_ERROR",
                    "message": "Image validation failed",
                    "errors": validation.errors,
                    "warnings": validation.warnings,
                    "dimensions": f"{validation.width}x{validation.height}",
                    "hint": "OMR sheets should be portrait orientation with minimum 800x1000 pixels",
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
    Uses rectangle detection and perspective correction.
    """
    import cv2
    import numpy as np
    import os
    from datetime import datetime
    from app.services.omr_processor import OMRProcessor
    
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
    
    # Use OMRProcessor to detect rectangle and apply perspective
    processor = OMRProcessor()
    warped = processor._find_answer_region_smart(original)
    
    warped_path = os.path.join(debug_dir, f"2_warped_{timestamp}.jpg")
    cv2.imwrite(warped_path, warped)
    
    # Gray and threshold
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    binary_path = os.path.join(debug_dir, f"3_binary_{timestamp}.jpg")
    cv2.imwrite(binary_path, binary)
    
    # Draw grid overlay on warped image
    ch, cw = warped.shape[:2]
    grid_overlay = warped.copy()
    
    num_cols = 3
    rows_per_col = 30
    col_width = cw / num_cols
    row_height = ch / rows_per_col
    
    # Draw column lines (GREEN)
    for i in range(num_cols + 1):
        x = int(i * col_width)
        cv2.line(grid_overlay, (x, 0), (x, ch), (0, 255, 0), 2)
    
    # Draw row lines (GREEN thin)
    for i in range(rows_per_col + 1):
        y = int(i * row_height)
        cv2.line(grid_overlay, (0, y), (cw, y), (0, 255, 0), 1)
    
    # CALIBRATION v17: With adaptive thresholding
    bubble_area_start = 0.22  # Skip question number
    bubble_area_end = 0.98    # Almost to column edge
    
    # Draw bubble positions (BLUE circles)
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
            # Draw circle in BLUE
            cv2.circle(grid_overlay, (x_center, y_center), int(bubble_width * 0.35), (255, 0, 0), 2)
            # Label with A, B, C, D, E
            label = chr(65 + opt_idx)  # A=65, B=66, etc.
            cv2.putText(grid_overlay, label, (x_center - 5, y_center + 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 255), 1)
    
    grid_path = os.path.join(debug_dir, f"4_grid_overlay_{timestamp}.jpg")
    cv2.imwrite(grid_path, grid_overlay)
    
    logger.info(f"Debug images saved to: {debug_dir}")
    
    return {
        "message": "Debug images saved with adaptive detection",
        "detection_method": "rectangle_contour + adaptive_threshold",
        "debug_dir": debug_dir,
        "files": [
            original_path,
            warped_path,
            binary_path,
            grid_path,
        ],
        "warped_size": f"{cw}x{ch}",
        "grid_config": {
            "num_cols": num_cols,
            "rows_per_col": rows_per_col,
            "col_width": round(col_width, 2),
            "row_height": round(row_height, 2),
            "bubble_area_start": bubble_area_start,
            "bubble_area_end": bubble_area_end,
        },
        "features": [
            "Marker detection (template matching)",
            "Rectangle contour detection",
            "Perspective correction (warp)",
            "Adaptive threshold per row",
            "Global + local threshold calculation"
        ]
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
