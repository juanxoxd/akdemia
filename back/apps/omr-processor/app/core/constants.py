"""Processing constants and enums."""

from enum import Enum
from typing import Final


# ============================================
# Processing Status
# ============================================

class ProcessingStatus(str, Enum):
    """Processing status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


class AnswerStatus(str, Enum):
    """Answer detection status."""
    DETECTED = "detected"
    AMBIGUOUS = "ambiguous"
    BLANK = "blank"
    MULTIPLE = "multiple"
    INVALID = "invalid"


class ImageQualityLevel(str, Enum):
    """Image quality classification."""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    UNACCEPTABLE = "unacceptable"


# ============================================
# Detection Thresholds
# ============================================

MARK_DETECTION_THRESHOLD: Final[float] = 0.65
CONFIDENCE_THRESHOLD: Final[float] = 0.85
AMBIGUITY_THRESHOLD: Final[float] = 0.4
MIN_CONTRAST_RATIO: Final[float] = 0.3

# ============================================
# Image Constraints
# ============================================

MIN_IMAGE_WIDTH: Final[int] = 800
MIN_IMAGE_HEIGHT: Final[int] = 1000
MAX_IMAGE_WIDTH: Final[int] = 4000
MAX_IMAGE_HEIGHT: Final[int] = 5000
OPTIMAL_DPI: Final[int] = 300

# ============================================
# OMR Configuration
# ============================================

DEFAULT_OPTIONS_PER_QUESTION: Final[int] = 5
MAX_OPTIONS_PER_QUESTION: Final[int] = 10
MIN_QUESTIONS: Final[int] = 1
MAX_QUESTIONS: Final[int] = 200

# ============================================
# Multi-Column Layout Configuration
# (Para hojas como GIB D'Nivel con 3 columnas)
# ============================================

# Número de columnas en la hoja de respuestas
DEFAULT_COLUMNS: Final[int] = 3

# Preguntas por columna (90 preguntas / 3 columnas = 30)
DEFAULT_ROWS_PER_COLUMN: Final[int] = 30

# Configuración del layout GIB D'Nivel
GIB_DNIVEL_CONFIG: Final[dict] = {
    "columns": 3,
    "rows_per_column": 30,
    "total_questions": 90,
    "options_per_question": 5,
    # Porcentajes de la imagen para localizar el área de respuestas
    "answer_area_top_percent": 0.35,      # El área empieza al 35% desde arriba
    "answer_area_bottom_percent": 0.98,   # El área termina al 98%
    "answer_area_left_percent": 0.50,     # El área de respuestas está en la mitad derecha
    "answer_area_right_percent": 0.98,
}

# ============================================
# Quality Thresholds
# ============================================

MIN_QUALITY_SCORE: Final[float] = 0.7
BLUR_THRESHOLD: Final[float] = 100.0
NOISE_THRESHOLD: Final[float] = 0.1
ALIGNMENT_ERROR_MARGIN: Final[float] = 0.02  # 2%

# ============================================
# Answer Labels
# ============================================

ANSWER_LABELS: Final[tuple] = ("A", "B", "C", "D", "E", "F", "G", "H", "I", "J")

# ============================================
# Error Codes
# ============================================

class ErrorCode(str, Enum):
    """Processing error codes."""
    IMAGE_TOO_SMALL = "IMAGE_TOO_SMALL"
    IMAGE_TOO_LARGE = "IMAGE_TOO_LARGE"
    LOW_QUALITY = "LOW_QUALITY"
    ALIGNMENT_FAILED = "ALIGNMENT_FAILED"
    NO_MARKS_DETECTED = "NO_MARKS_DETECTED"
    MULTIPLE_MARKS = "MULTIPLE_MARKS"
    INVALID_FORMAT = "INVALID_FORMAT"
    TIMING_MARKS_NOT_FOUND = "TIMING_MARKS_NOT_FOUND"
    PROCESSING_ERROR = "PROCESSING_ERROR"
