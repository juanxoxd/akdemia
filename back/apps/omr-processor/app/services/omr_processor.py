"""OMR Processing service - core mark detection logic."""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple
import io

import cv2
import numpy as np
from PIL import Image

from app.core.constants import (
    ANSWER_LABELS,
    MARK_DETECTION_THRESHOLD,
    CONFIDENCE_THRESHOLD,
    AMBIGUITY_THRESHOLD,
    AnswerStatus,
)
from app.schemas.processing import DetectedAnswer


@dataclass
class OMRResult:
    """Result of OMR processing."""

    answers: List[DetectedAnswer] = field(default_factory=list)
    confidence_score: float = 0.0
    warnings: List[str] = field(default_factory=list)
    processed_image: Optional[np.ndarray] = None


class OMRProcessor:
    """
    Optical Mark Recognition processor.
    
    Detects filled bubbles/marks on answer sheets using OpenCV.
    """

    def __init__(
        self,
        mark_threshold: float = MARK_DETECTION_THRESHOLD,
        confidence_threshold: float = CONFIDENCE_THRESHOLD,
    ):
        self.mark_threshold = mark_threshold
        self.confidence_threshold = confidence_threshold

    def process_image(
        self,
        image_data: bytes,
        total_questions: int,
        options_per_question: int,
    ) -> OMRResult:
        """
        Process an OMR image and detect marked answers.
        
        Args:
            image_data: Raw image bytes
            total_questions: Expected number of questions
            options_per_question: Number of options per question (A, B, C, D, E...)
            
        Returns:
            OMRResult with detected answers and confidence scores
        """
        warnings: List[str] = []
        answers: List[DetectedAnswer] = []

        # Decode image
        np_array = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        if image is None:
            return OMRResult(
                answers=[],
                confidence_score=0,
                warnings=["Failed to decode image"],
            )

        # Preprocess image
        processed = self._preprocess_image(image)

        # Detect answer regions (ROI)
        # In a real implementation, this would detect timing marks and
        # calculate the exact positions of answer bubbles
        bubble_grid = self._detect_bubble_grid(
            processed,
            total_questions,
            options_per_question,
        )

        # Analyze each question
        total_confidence = 0.0

        for question_num in range(1, total_questions + 1):
            answer = self._analyze_question(
                processed,
                bubble_grid,
                question_num,
                options_per_question,
            )
            answers.append(answer)
            total_confidence += answer.confidence_score

            # Check for issues
            if answer.status == AnswerStatus.MULTIPLE:
                warnings.append(f"Question {question_num}: Multiple marks detected")
            elif answer.status == AnswerStatus.AMBIGUOUS:
                warnings.append(f"Question {question_num}: Ambiguous mark")
            elif answer.status == AnswerStatus.BLANK:
                warnings.append(f"Question {question_num}: No mark detected")

        # Calculate overall confidence
        overall_confidence = total_confidence / total_questions if total_questions > 0 else 0

        return OMRResult(
            answers=answers,
            confidence_score=round(overall_confidence, 4),
            warnings=warnings,
            processed_image=processed,
        )

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for OMR detection.
        
        Steps:
        1. Convert to grayscale
        2. Apply Gaussian blur to reduce noise
        3. Apply adaptive thresholding for binarization
        4. Apply morphological operations to clean up
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11,
            2,
        )

        # Morphological operations to clean up
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        return cleaned

    def _detect_bubble_grid(
        self,
        image: np.ndarray,
        total_questions: int,
        options_per_question: int,
    ) -> dict:
        """
        Detect the bubble grid layout.
        
        In a production system, this would:
        1. Detect timing marks/corner markers
        2. Correct perspective distortion
        3. Calculate exact bubble positions
        
        For now, returns a simulated grid based on image dimensions.
        """
        height, width = image.shape[:2]

        # Calculate grid parameters (simplified)
        # In production, this would be detected from the actual sheet
        margin_x = int(width * 0.1)
        margin_y = int(height * 0.15)
        usable_width = width - 2 * margin_x
        usable_height = height - 2 * margin_y

        bubble_width = int(usable_width / options_per_question)
        bubble_height = int(usable_height / total_questions)

        grid = {
            "margin_x": margin_x,
            "margin_y": margin_y,
            "bubble_width": bubble_width,
            "bubble_height": bubble_height,
            "options": options_per_question,
        }

        return grid

    def _analyze_question(
        self,
        image: np.ndarray,
        grid: dict,
        question_num: int,
        options_per_question: int,
    ) -> DetectedAnswer:
        """
        Analyze a single question row to detect the marked answer.
        """
        margin_x = grid["margin_x"]
        margin_y = grid["margin_y"]
        bubble_width = grid["bubble_width"]
        bubble_height = grid["bubble_height"]

        # Calculate Y position for this question
        y_start = margin_y + (question_num - 1) * bubble_height
        y_end = y_start + bubble_height

        # Analyze each option bubble
        option_scores: List[Tuple[int, float]] = []

        for option_idx in range(options_per_question):
            x_start = margin_x + option_idx * bubble_width
            x_end = x_start + bubble_width

            # Extract bubble region
            bubble_region = image[y_start:y_end, x_start:x_end]

            # Calculate fill ratio (white pixels in inverted binary = filled marks)
            if bubble_region.size > 0:
                fill_ratio = np.sum(bubble_region > 0) / bubble_region.size
            else:
                fill_ratio = 0

            option_scores.append((option_idx, fill_ratio))

        # Sort by fill ratio (highest first)
        option_scores.sort(key=lambda x: x[1], reverse=True)

        # Determine the answer based on scores
        highest_score = option_scores[0][1] if option_scores else 0
        second_highest = option_scores[1][1] if len(option_scores) > 1 else 0

        # Decision logic
        if highest_score < AMBIGUITY_THRESHOLD:
            # No mark detected (blank)
            return DetectedAnswer(
                question_number=question_num,
                selected_option=None,
                selected_option_label=None,
                confidence_score=1.0 - highest_score,
                status=AnswerStatus.BLANK,
            )

        if highest_score < self.mark_threshold:
            # Ambiguous mark
            return DetectedAnswer(
                question_number=question_num,
                selected_option=option_scores[0][0],
                selected_option_label=ANSWER_LABELS[option_scores[0][0]],
                confidence_score=highest_score,
                status=AnswerStatus.AMBIGUOUS,
            )

        # Check for multiple marks
        if second_highest > self.mark_threshold * 0.8:
            return DetectedAnswer(
                question_number=question_num,
                selected_option=option_scores[0][0],
                selected_option_label=ANSWER_LABELS[option_scores[0][0]],
                confidence_score=(highest_score - second_highest),
                status=AnswerStatus.MULTIPLE,
            )

        # Clear detection
        confidence = min(highest_score / self.mark_threshold, 1.0)

        return DetectedAnswer(
            question_number=question_num,
            selected_option=option_scores[0][0],
            selected_option_label=ANSWER_LABELS[option_scores[0][0]],
            confidence_score=round(confidence, 4),
            status=AnswerStatus.DETECTED,
        )

    def _correct_perspective(self, image: np.ndarray, corners: np.ndarray) -> np.ndarray:
        """
        Correct perspective distortion using detected corner points.
        
        Args:
            image: Input image
            corners: 4 corner points in order [top-left, top-right, bottom-right, bottom-left]
            
        Returns:
            Perspective-corrected image
        """
        # Determine target size based on source corners
        width_top = np.linalg.norm(corners[0] - corners[1])
        width_bottom = np.linalg.norm(corners[2] - corners[3])
        width = int(max(width_top, width_bottom))

        height_left = np.linalg.norm(corners[0] - corners[3])
        height_right = np.linalg.norm(corners[1] - corners[2])
        height = int(max(height_left, height_right))

        # Define target corners
        dst_corners = np.array([
            [0, 0],
            [width - 1, 0],
            [width - 1, height - 1],
            [0, height - 1],
        ], dtype=np.float32)

        # Calculate perspective transform matrix
        matrix = cv2.getPerspectiveTransform(corners.astype(np.float32), dst_corners)

        # Apply transformation
        corrected = cv2.warpPerspective(image, matrix, (width, height))

        return corrected
