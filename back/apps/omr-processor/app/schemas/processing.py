"""Processing schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field

from app.core.constants import AnswerStatus, ImageQualityLevel, ProcessingStatus


class DetectedAnswer(BaseModel):
    """Detected answer from OMR processing."""

    question_number: int = Field(..., ge=1, description="Question number (1-indexed)")
    selected_option: Optional[int] = Field(None, ge=0, description="Selected option index (0-indexed)")
    selected_option_label: Optional[str] = Field(None, description="Selected option label (A, B, C...)")
    confidence_score: float = Field(..., ge=0, le=1, description="Detection confidence (0-1)")
    status: AnswerStatus = Field(..., description="Detection status")


class ProcessingRequest(BaseModel):
    """Processing request parameters."""

    exam_id: str = Field(..., description="Exam UUID")
    student_id: Optional[str] = Field(None, description="Student UUID (for student answers)")
    attempt_id: Optional[str] = Field(None, description="Attempt UUID (for student answers)")
    is_answer_key: bool = Field(False, description="Whether this is an answer key")
    total_questions: int = Field(..., ge=1, le=200, description="Total number of questions")
    options_per_question: int = Field(5, ge=2, le=10, description="Options per question")


class ProcessingResponse(BaseModel):
    """Processing response."""

    success: bool = Field(..., description="Whether processing was successful")
    status: ProcessingStatus = Field(..., description="Processing status")
    detected_answers: List[DetectedAnswer] = Field(default_factory=list, description="Detected answers")
    confidence_score: float = Field(0, ge=0, le=1, description="Overall confidence score")
    quality_score: float = Field(0, ge=0, le=1, description="Image quality score")
    quality_level: ImageQualityLevel = Field(ImageQualityLevel.ACCEPTABLE, description="Quality level")
    processed_image_url: Optional[str] = Field(None, description="URL of processed image with annotations")
    processing_time_ms: int = Field(0, ge=0, description="Processing time in milliseconds")
    warnings: List[str] = Field(default_factory=list, description="Processing warnings")
    error_code: Optional[str] = Field(None, description="Error code if failed")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class ImageValidationResult(BaseModel):
    """Image validation result."""

    is_valid: bool = Field(..., description="Whether image is valid for processing")
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    format: str = Field(..., description="Image format")
    quality_score: float = Field(..., ge=0, le=1, description="Quality score (0-1)")
    quality_level: ImageQualityLevel = Field(..., description="Quality level classification")
    blur_score: float = Field(..., description="Blur detection score")
    contrast_score: float = Field(..., description="Contrast score")
    brightness_score: float = Field(..., description="Brightness score")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")


class BoundingBox(BaseModel):
    """Bounding box coordinates."""

    x: int = Field(..., ge=0, description="X coordinate")
    y: int = Field(..., ge=0, description="Y coordinate")
    width: int = Field(..., ge=0, description="Width")
    height: int = Field(..., ge=0, description="Height")
