"""Image validation service."""

from dataclasses import dataclass
from typing import List, Tuple
import io

import cv2
import numpy as np
from PIL import Image
import structlog

from app.core.constants import (
    MIN_IMAGE_WIDTH,
    MIN_IMAGE_HEIGHT,
    MAX_IMAGE_WIDTH,
    MAX_IMAGE_HEIGHT,
    MIN_QUALITY_SCORE,
    BLUR_THRESHOLD,
    ImageQualityLevel,
    ErrorCode,
)
from app.schemas.processing import ImageValidationResult

logger = structlog.get_logger()


class ImageValidator:
    """Validates images for OMR processing."""

    def validate(self, image_data: bytes) -> ImageValidationResult:
        """
        Validate an image for OMR processing.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            ImageValidationResult with validation details
        """
        errors: List[str] = []
        warnings: List[str] = []

        try:
            # Load image with PIL for format detection
            pil_image = Image.open(io.BytesIO(image_data))
            width, height = pil_image.size
            image_format = pil_image.format or "UNKNOWN"
            
            logger.info(
                "Validating image",
                width=width,
                height=height,
                format=image_format,
                size_bytes=len(image_data),
                orientation="landscape" if width > height else "portrait",
            )

            # Convert to OpenCV format for analysis
            np_array = np.frombuffer(image_data, np.uint8)
            cv_image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

            if cv_image is None:
                logger.error("Failed to decode image with OpenCV")
                return ImageValidationResult(
                    is_valid=False,
                    width=0,
                    height=0,
                    format="UNKNOWN",
                    quality_score=0,
                    quality_level=ImageQualityLevel.UNACCEPTABLE,
                    blur_score=0,
                    contrast_score=0,
                    brightness_score=0,
                    errors=[f"{ErrorCode.INVALID_FORMAT}: Could not decode image"],
                    warnings=[],
                )

            # Check dimensions
            if width < MIN_IMAGE_WIDTH or height < MIN_IMAGE_HEIGHT:
                error_msg = (
                    f"{ErrorCode.IMAGE_TOO_SMALL}: Image too small "
                    f"({width}x{height}), minimum is {MIN_IMAGE_WIDTH}x{MIN_IMAGE_HEIGHT}"
                )
                errors.append(error_msg)
                logger.warning(
                    "Image dimensions too small",
                    width=width,
                    height=height,
                    min_width=MIN_IMAGE_WIDTH,
                    min_height=MIN_IMAGE_HEIGHT,
                )
                
                # Check if image might be rotated (landscape instead of portrait)
                if width > height and height < MIN_IMAGE_HEIGHT:
                    warnings.append(
                        f"Image appears to be in landscape orientation ({width}x{height}). "
                        "OMR sheets are typically portrait. Consider rotating the image 90 degrees."
                    )
                    logger.info(
                        "Possible orientation issue detected",
                        suggestion="Image may need to be rotated 90 degrees",
                    )

            if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
                errors.append(
                    f"{ErrorCode.IMAGE_TOO_LARGE}: Image too large "
                    f"({width}x{height}), maximum is {MAX_IMAGE_WIDTH}x{MAX_IMAGE_HEIGHT}"
                )

            # Calculate quality metrics
            blur_score = self._calculate_blur_score(cv_image)
            contrast_score = self._calculate_contrast_score(cv_image)
            brightness_score = self._calculate_brightness_score(cv_image)

            # Overall quality score (weighted average)
            quality_score = (
                blur_score * 0.4 +
                contrast_score * 0.35 +
                brightness_score * 0.25
            )

            # Classify quality level
            quality_level = self._classify_quality(quality_score)
            
            logger.info(
                "Quality metrics calculated",
                blur_score=round(blur_score, 4),
                contrast_score=round(contrast_score, 4),
                brightness_score=round(brightness_score, 4),
                quality_score=round(quality_score, 4),
                quality_level=quality_level,
            )

            if quality_score < MIN_QUALITY_SCORE:
                errors.append(
                    f"{ErrorCode.LOW_QUALITY}: Image quality too low "
                    f"({quality_score:.2f}), minimum is {MIN_QUALITY_SCORE}"
                )
                logger.warning(
                    "Image quality below threshold",
                    quality_score=round(quality_score, 4),
                    min_required=MIN_QUALITY_SCORE,
                )

            # Add warnings for borderline metrics
            if blur_score < 0.6:
                warnings.append("Image appears blurry, which may affect detection accuracy")

            if contrast_score < 0.5:
                warnings.append("Low contrast detected, consider improving lighting")

            if brightness_score < 0.3 or brightness_score > 0.85:
                warnings.append("Brightness level is not optimal")

            is_valid = len(errors) == 0
            
            logger.info(
                "Image validation completed",
                is_valid=is_valid,
                errors_count=len(errors),
                warnings_count=len(warnings),
                errors=errors if errors else None,
            )

            return ImageValidationResult(
                is_valid=is_valid,
                width=width,
                height=height,
                format=image_format,
                quality_score=quality_score,
                quality_level=quality_level,
                blur_score=blur_score,
                contrast_score=contrast_score,
                brightness_score=brightness_score,
                errors=errors,
                warnings=warnings,
            )

        except Exception as e:
            return ImageValidationResult(
                is_valid=False,
                width=0,
                height=0,
                format="UNKNOWN",
                quality_score=0,
                quality_level=ImageQualityLevel.UNACCEPTABLE,
                blur_score=0,
                contrast_score=0,
                brightness_score=0,
                errors=[f"{ErrorCode.INVALID_FORMAT}: {str(e)}"],
                warnings=[],
            )

    def _calculate_blur_score(self, image: np.ndarray) -> float:
        """Calculate blur score using Laplacian variance."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Normalize to 0-1 range (higher is better/less blurry)
        # Using BLUR_THRESHOLD as the reference point
        score = min(laplacian_var / BLUR_THRESHOLD, 1.0)
        return round(score, 4)

    def _calculate_contrast_score(self, image: np.ndarray) -> float:
        """Calculate contrast score using standard deviation."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        std_dev = gray.std()

        # Normalize (good contrast usually has std > 50)
        score = min(std_dev / 80.0, 1.0)
        return round(score, 4)

    def _calculate_brightness_score(self, image: np.ndarray) -> float:
        """Calculate brightness score (optimal around 0.5)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mean_brightness = gray.mean() / 255.0

        # Score based on distance from optimal (0.5)
        # Perfect score at 0.5, decreasing towards 0 and 1
        score = 1.0 - abs(mean_brightness - 0.5) * 2
        return round(max(0, score), 4)

    def _classify_quality(self, score: float) -> ImageQualityLevel:
        """Classify quality level based on score."""
        if score >= 0.9:
            return ImageQualityLevel.EXCELLENT
        elif score >= 0.8:
            return ImageQualityLevel.GOOD
        elif score >= 0.7:
            return ImageQualityLevel.ACCEPTABLE
        elif score >= 0.5:
            return ImageQualityLevel.POOR
        else:
            return ImageQualityLevel.UNACCEPTABLE
