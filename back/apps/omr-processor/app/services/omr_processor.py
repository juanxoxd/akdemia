"""OMR Processing service - optimized for phone photos with adaptive thresholding."""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict
import io
import base64

import cv2
import numpy as np
from PIL import Image
import structlog

from app.core.constants import (
    ANSWER_LABELS,
    AnswerStatus,
)
from app.schemas.processing import DetectedAnswer
from app.services.image_utils import ImageUtils, MarkerDetector, AdaptiveThreshold, HorizontalLineDetector

logger = structlog.get_logger()


@dataclass
class OMRResult:
    """Result of OMR processing."""
    answers: List[DetectedAnswer] = field(default_factory=list)
    confidence_score: float = 0.0
    warnings: List[str] = field(default_factory=list)
    processed_image: Optional[np.ndarray] = None
    debug_image_base64: Optional[str] = None  # For debugging alignment


class OMRProcessor:
    """
    OMR Processor optimized for phone camera photos.
    Uses multiple detection strategies to find the answer region.
    """

    def __init__(self):
        self.num_columns = 3
        self.rows_per_column = 30
        self.options_per_question = 5

    def process_image(
        self,
        image_data: bytes,
        total_questions: int,
        options_per_question: int,
        # Optional manual calibration coordinates
        calibration: Optional[Dict] = None,
    ) -> OMRResult:
        """Process an OMR image and detect marked answers."""
        warnings: List[str] = []
        self.options_per_question = options_per_question
        
        # Decode image
        np_array = np.frombuffer(image_data, np.uint8)
        original = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        if original is None:
            logger.error("Failed to decode image")
            return OMRResult(answers=[], confidence_score=0, warnings=["Failed to decode image"])

        height, width = original.shape[:2]
        logger.info(f"Image decoded: {width}x{height}")

        # Step 1: Find answer region
        answer_region = self._find_answer_region_smart(original)
        
        h, w = answer_region.shape[:2]
        logger.info(f"Answer region: {w}x{h}")
        
        # Step 2: Preprocess
        gray = cv2.cvtColor(answer_region, cv2.COLOR_BGR2GRAY)
        
        # Enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Threshold
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Step 3: Use grid-based detection (contour detection was not reliable)
        # The grid method is calibrated specifically for GIB D'Nivel layout
        answers = self._analyze_grid(binary, gray, total_questions, options_per_question)
        
        # Calculate statistics
        detected_count = sum(1 for a in answers if a.status == AnswerStatus.DETECTED)
        total_conf = sum(a.confidence_score for a in answers if a.status == AnswerStatus.DETECTED)
        overall_confidence = total_conf / detected_count if detected_count > 0 else 0
        
        for a in answers:
            if a.status == AnswerStatus.BLANK:
                warnings.append(f"Question {a.question_number}: No mark detected")
            elif a.status == AnswerStatus.MULTIPLE:
                warnings.append(f"Question {a.question_number}: Multiple marks detected")
        
        self._log_results(answers, overall_confidence)
        
        return OMRResult(
            answers=answers,
            confidence_score=round(overall_confidence, 4),
            warnings=warnings,
            processed_image=binary,
        )

    def _find_answer_region_smart(self, image: np.ndarray) -> np.ndarray:
        """
        Detect the answer region using multiple strategies:
        1. Rectangle contour detection (works for GIB D'Nivel)
        2. Fallback to fixed coordinates
        
        Note: Marker detection disabled for GIB D'Nivel as it doesn't have
        corner markers. Enable only for sheets with specific corner markers.
        """
        height, width = image.shape[:2]
        
        # Strategy 1: Try to detect the main rectangle (black border)
        # This works well for GIB D'Nivel sheets
        detected_region = self._detect_main_rectangle(image)
        
        if detected_region is not None:
            logger.info("Rectangle detected - using perspective correction")
            return detected_region
        
        # Strategy 2: Fallback to fixed coordinates
        logger.warning("Rectangle detection failed - using fallback coordinates")
        if width >= 3500 and height >= 1500:
            x_start = 2000
            x_end = 3280
            y_start = 95
            y_end = 1785
            cropped = image[y_start:y_end, x_start:x_end]
        else:
            x_start = int(width * 0.505)
            x_end = int(width * 0.82)
            y_start = int(height * 0.054)
            y_end = int(height * 0.963)
            cropped = image[y_start:y_end, x_start:x_end]
        
        return cropped
    
    def _crop_header_footer(self, image: np.ndarray, top_percent: float = 0.02, bottom_percent: float = 0.01) -> np.ndarray:
        """Crop header and footer from warped image."""
        h, w = image.shape[:2]
        y_start = int(h * top_percent)
        y_end = int(h * (1 - bottom_percent))
        return image[y_start:y_end, :]

    def _detect_main_rectangle(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect the main black rectangle that contains the answer bubbles.
        Apply perspective transform to "flatten" the image.
        """
        height, width = image.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Use adaptive threshold to handle varying lighting
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return None
        
        # Find the largest rectangular contour (should be the answer box)
        best_contour = None
        best_area = 0
        min_area = (width * height) * 0.1  # At least 10% of image
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue
            
            # Approximate contour to polygon
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            # We want a quadrilateral (4 corners)
            if len(approx) == 4 and area > best_area:
                best_contour = approx
                best_area = area
        
        if best_contour is None:
            # Try edge detection as alternative
            return self._detect_rectangle_by_edges(image)
        
        # Apply perspective transform
        return self._apply_perspective_transform(image, best_contour)

    def _detect_rectangle_by_edges(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Alternative method: detect rectangle using Canny edges and Hough lines.
        """
        height, width = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Canny edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Dilate to connect edge segments
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)
        
        # Find contours on edges
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Look for large rectangular contour
        for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            if len(approx) == 4:
                area = cv2.contourArea(approx)
                if area > (width * height) * 0.1:
                    return self._apply_perspective_transform(image, approx)
        
        return None

    def _apply_perspective_transform(self, image: np.ndarray, corners: np.ndarray) -> np.ndarray:
        """
        Apply perspective transform to flatten the detected rectangle.
        """
        # Order points: top-left, top-right, bottom-right, bottom-left
        corners = corners.reshape(4, 2)
        ordered = self._order_points(corners)
        
        (tl, tr, br, bl) = ordered
        
        # Calculate dimensions of the new image
        width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        max_width = max(int(width_a), int(width_b))
        
        height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        max_height = max(int(height_a), int(height_b))
        
        # Destination points for perspective transform
        dst = np.array([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1]
        ], dtype=np.float32)
        
        # Source points
        src = ordered.astype(np.float32)
        
        # Calculate perspective transform matrix
        matrix = cv2.getPerspectiveTransform(src, dst)
        
        # Apply perspective transform
        warped = cv2.warpPerspective(image, matrix, (max_width, max_height))
        
        # CALIBRATION v14: Crop top (header) and bottom (extra space)
        # The detected rectangle includes a small header area with row numbers
        crop_top_percent = 0.02     # Remove ~2% from top (header area)
        crop_bottom_percent = 0.01  # Remove ~1% from bottom (extra space)
        
        h, w = warped.shape[:2]
        y_start = int(h * crop_top_percent)
        y_end = int(h * (1 - crop_bottom_percent))
        warped = warped[y_start:y_end, :]
        
        logger.info(f"Perspective corrected: {warped.shape[1]}x{warped.shape[0]}")
        return warped

    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        """
        Order points in: top-left, top-right, bottom-right, bottom-left order.
        """
        rect = np.zeros((4, 2), dtype=np.float32)
        
        # Sum of coordinates: top-left has smallest, bottom-right has largest
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        
        # Difference: top-right has smallest, bottom-left has largest
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        
        return rect

    def _detect_bubbles_by_contours(
        self, 
        binary: np.ndarray, 
        gray: np.ndarray,
        total_questions: int,
        options_per_question: int
    ) -> List[DetectedAnswer]:
        """
        Detect bubbles using contour detection and circle fitting.
        """
        h, w = binary.shape[:2]
        
        # Find all contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours that look like bubbles (roughly circular, right size)
        bubbles = []
        estimated_bubble_radius = min(w, h) / 60  # Rough estimate
        
        for contour in contours:
            area = cv2.contourArea(contour)
            perimeter = cv2.arcLength(contour, True)
            
            if perimeter == 0:
                continue
            
            # Circularity check
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            
            # Size check (bubbles should be roughly 10-40 pixels in diameter)
            radius = np.sqrt(area / np.pi) if area > 0 else 0
            
            if 0.5 < circularity < 1.5 and estimated_bubble_radius * 0.3 < radius < estimated_bubble_radius * 2:
                # Get centroid
                M = cv2.moments(contour)
                if M["m00"] > 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    
                    # Calculate fill ratio using the gray image
                    mask = np.zeros_like(gray)
                    cv2.drawContours(mask, [contour], -1, 255, -1)
                    mean_val = cv2.mean(gray, mask=mask)[0]
                    fill_ratio = 1.0 - (mean_val / 255.0)  # Darker = more filled
                    
                    bubbles.append({
                        'x': cx,
                        'y': cy,
                        'radius': radius,
                        'fill': fill_ratio,
                        'area': area
                    })
        
        logger.info(f"Found {len(bubbles)} potential bubbles")
        
        if len(bubbles) < total_questions:
            # Not enough bubbles found, return empty to trigger fallback
            return []
        
        # Group bubbles by rows (Y coordinate)
        bubbles.sort(key=lambda b: b['y'])
        
        num_cols = 3
        rows_per_col = 30
        col_width = w / num_cols
        row_height = h / rows_per_col
        
        # Assign bubbles to questions
        question_bubbles: Dict[int, List[dict]] = {i: [] for i in range(1, total_questions + 1)}
        
        for bubble in bubbles:
            # Determine column
            col = int(bubble['x'] / col_width)
            col = min(col, num_cols - 1)
            
            # Determine row
            row = int(bubble['y'] / row_height)
            row = min(row, rows_per_col - 1)
            
            # Calculate question number
            q_num = col * rows_per_col + row + 1
            
            if 1 <= q_num <= total_questions:
                question_bubbles[q_num].append(bubble)
        
        # For each question, determine the answer
        answers = []
        
        for q_num in range(1, total_questions + 1):
            bubbles_for_q = question_bubbles[q_num]
            
            if len(bubbles_for_q) == 0:
                answers.append(DetectedAnswer(
                    question_number=q_num,
                    selected_option=None,
                    selected_option_label=None,
                    confidence_score=0,
                    status=AnswerStatus.BLANK,
                ))
                continue
            
            # Sort by X coordinate (left to right = A, B, C, D, E)
            bubbles_for_q.sort(key=lambda b: b['x'])
            
            # Find the most filled bubble
            best_idx = 0
            best_fill = 0
            second_fill = 0
            
            for i, bubble in enumerate(bubbles_for_q):
                if bubble['fill'] > best_fill:
                    second_fill = best_fill
                    best_fill = bubble['fill']
                    best_idx = i
                elif bubble['fill'] > second_fill:
                    second_fill = bubble['fill']
            
            # Determine option index
            # If we have exactly 5 bubbles, indices 0-4 map to A-E
            option_idx = min(best_idx, options_per_question - 1)
            
            # Decision thresholds
            if best_fill < 0.3:
                status = AnswerStatus.BLANK
                option_idx = None
                label = None
            elif best_fill - second_fill < 0.1 and second_fill > 0.25:
                status = AnswerStatus.MULTIPLE
                label = ANSWER_LABELS[option_idx]
            else:
                status = AnswerStatus.DETECTED
                label = ANSWER_LABELS[option_idx]
            
            answers.append(DetectedAnswer(
                question_number=q_num,
                selected_option=option_idx,
                selected_option_label=label,
                confidence_score=best_fill if status == AnswerStatus.DETECTED else best_fill - second_fill,
                status=status,
            ))
        
        return answers

    def _analyze_grid(
        self, 
        binary: np.ndarray, 
        gray: np.ndarray,
        total_questions: int, 
        options_per_question: int
    ) -> List[DetectedAnswer]:
        """
        Grid-based analysis with RELATIVE CONTRAST detection.
        Uses the darkest bubble in each row as the answer, with confidence based on contrast.
        This is more robust for curved paper and varying lighting.
        """
        answers = []
        h, w = binary.shape[:2]
        
        num_cols = 3
        rows_per_col = 30
        
        col_width = w / num_cols
        row_height = h / rows_per_col
        
        # CALIBRATION v19 - Relative contrast approach (no absolute threshold)
        bubble_area_start = 0.22
        bubble_area_end = 0.98
        
        # Process each question
        for q_num in range(1, total_questions + 1):
            col_idx = (q_num - 1) // rows_per_col
            row_idx = (q_num - 1) % rows_per_col
            
            # Calculate row boundaries with LARGE tolerance for curvature
            # Use 95% of row height to capture bubbles even with curvature
            y_center = (row_idx + 0.5) * row_height
            y_start = max(0, int(y_center - row_height * 0.48))
            y_end = min(h, int(y_center + row_height * 0.48))
            
            # Column boundaries
            x_col_start = int(col_idx * col_width)
            bubble_start = x_col_start + int(col_width * bubble_area_start)
            bubble_end = x_col_start + int(col_width * bubble_area_end)
            bubble_width = (bubble_end - bubble_start) / options_per_question
            
            # Collect intensity for each option
            option_intensities = []
            
            for opt_idx in range(options_per_question):
                x_start = int(bubble_start + opt_idx * bubble_width + bubble_width * 0.08)
                x_end = int(bubble_start + (opt_idx + 1) * bubble_width - bubble_width * 0.08)
                
                # Clamp to image bounds
                x_start = max(0, min(x_start, w - 1))
                x_end = max(x_start + 1, min(x_end, w))
                y_start_b = max(0, min(y_start, h - 1))
                y_end_b = max(y_start_b + 1, min(y_end, h))
                
                # Get mean intensity (lower = darker = more likely marked)
                region = gray[y_start_b:y_end_b, x_start:x_end]
                
                if region.size > 0:
                    mean_intensity = np.mean(region)
                else:
                    mean_intensity = 255  # White = unmarked
                
                option_intensities.append(mean_intensity)
            
            # Determine answer using RELATIVE CONTRAST
            answer = self._determine_answer_by_contrast(q_num, option_intensities)
            answers.append(answer)
        
        # Log summary stats
        detected = sum(1 for a in answers if a.status == AnswerStatus.DETECTED)
        logger.info(f"Grid analysis complete: {detected}/{len(answers)} detected")
        
        return answers

    def _determine_answer_by_contrast(
        self, 
        question_num: int, 
        intensities: List[float]
    ) -> DetectedAnswer:
        """
        Determine answer using RELATIVE CONTRAST within the row.
        The darkest bubble is selected if it's significantly darker than others.
        This works regardless of absolute lighting conditions.
        """
        if not intensities:
            return DetectedAnswer(
                question_number=question_num,
                selected_option=None,
                selected_option_label=None,
                confidence_score=0,
                status=AnswerStatus.BLANK,
            )
        
        # Sort by intensity (ascending = darkest first)
        sorted_opts = sorted(enumerate(intensities), key=lambda x: x[1])
        darkest_idx, darkest_val = sorted_opts[0]
        second_darkest_val = sorted_opts[1][1] if len(sorted_opts) > 1 else darkest_val
        lightest_val = sorted_opts[-1][1]
        
        # Calculate contrast metrics
        row_range = lightest_val - darkest_val  # Range of intensities in this row
        contrast_to_second = second_darkest_val - darkest_val  # How much darker than second
        
        # Decision thresholds
        MIN_ROW_RANGE = 20  # Minimum range to consider that there's a marked bubble
        MIN_CONTRAST = 10  # Minimum contrast to second darkest
        
        # Check if there's enough contrast to detect a mark
        if row_range < MIN_ROW_RANGE:
            # All bubbles look similar - probably blank
            return DetectedAnswer(
                question_number=question_num,
                selected_option=None,
                selected_option_label=None,
                confidence_score=0.3,
                status=AnswerStatus.BLANK,
            )
        
        # Check if darkest is significantly darker than second
        if contrast_to_second < MIN_CONTRAST and len(sorted_opts) > 1:
            # Multiple marks or ambiguous
            return DetectedAnswer(
                question_number=question_num,
                selected_option=darkest_idx,
                selected_option_label=ANSWER_LABELS[darkest_idx],
                confidence_score=0.3,
                status=AnswerStatus.MULTIPLE,
            )
        
        # Clear detection - calculate confidence based on relative contrast
        confidence = min(1.0, contrast_to_second / 30.0)  # Higher contrast = higher confidence
        confidence = max(0.5, confidence)
        
        return DetectedAnswer(
            question_number=question_num,
            selected_option=darkest_idx,
            selected_option_label=ANSWER_LABELS[darkest_idx],
            confidence_score=round(confidence, 4),
            status=AnswerStatus.DETECTED,
        )

    def _determine_answer_adaptive(
        self, 
        question_num: int, 
        option_scores: List[Tuple[int, float]],
        intensities: List[float],
        local_threshold: float
    ) -> DetectedAnswer:
        """
        Determine answer using adaptive threshold approach.
        Lower intensity = darker = marked bubble.
        """
        if not option_scores:
            return DetectedAnswer(
                question_number=question_num,
                selected_option=None,
                selected_option_label=None,
                confidence_score=0,
                status=AnswerStatus.BLANK,
            )
        
        # Find the darkest bubble (lowest intensity)
        min_intensity_idx = np.argmin(intensities)
        min_intensity = intensities[min_intensity_idx]
        
        # Sort by intensity (ascending = darkest first)
        sorted_by_intensity = sorted(enumerate(intensities), key=lambda x: x[1])
        darkest_idx, darkest_val = sorted_by_intensity[0]
        second_darkest_val = sorted_by_intensity[1][1] if len(sorted_by_intensity) > 1 else 255
        
        # Calculate confidence based on how much darker the marked bubble is
        intensity_diff = second_darkest_val - darkest_val
        
        # Decision logic
        if darkest_val >= local_threshold:
            # No bubble is dark enough - BLANK
            return DetectedAnswer(
                question_number=question_num,
                selected_option=None,
                selected_option_label=None,
                confidence_score=0.5,
                status=AnswerStatus.BLANK,
            )
        
        # Check for multiple marks
        if second_darkest_val < local_threshold and intensity_diff < 15:
            # Both are marked and similar intensity
            return DetectedAnswer(
                question_number=question_num,
                selected_option=darkest_idx,
                selected_option_label=ANSWER_LABELS[darkest_idx],
                confidence_score=0.3,
                status=AnswerStatus.MULTIPLE,
            )
        
        # Single clear mark detected
        confidence = min(1.0, intensity_diff / 50.0)  # Higher diff = higher confidence
        confidence = max(0.5, confidence)
        
        return DetectedAnswer(
            question_number=question_num,
            selected_option=darkest_idx,
            selected_option_label=ANSWER_LABELS[darkest_idx],
            confidence_score=round(confidence, 4),
            status=AnswerStatus.DETECTED,
        )

    def _determine_answer(
        self, 
        question_num: int, 
        option_scores: List[Tuple[int, float]]
    ) -> DetectedAnswer:
        """Determine answer from option scores."""
        if not option_scores:
            return DetectedAnswer(
                question_number=question_num,
                selected_option=None,
                selected_option_label=None,
                confidence_score=0,
                status=AnswerStatus.BLANK,
            )
        
        sorted_scores = sorted(option_scores, key=lambda x: x[1], reverse=True)
        best_idx, best_score = sorted_scores[0]
        second_score = sorted_scores[1][1] if len(sorted_scores) > 1 else 0
        
        FILL_THRESHOLD = 0.28
        DIFF_THRESHOLD = 0.08
        
        diff = best_score - second_score
        
        if best_score < FILL_THRESHOLD:
            return DetectedAnswer(
                question_number=question_num,
                selected_option=None,
                selected_option_label=None,
                confidence_score=1.0 - best_score,
                status=AnswerStatus.BLANK,
            )
        
        if second_score >= FILL_THRESHOLD * 0.8 and diff < DIFF_THRESHOLD:
            return DetectedAnswer(
                question_number=question_num,
                selected_option=best_idx,
                selected_option_label=ANSWER_LABELS[best_idx],
                confidence_score=diff,
                status=AnswerStatus.MULTIPLE,
            )
        
        confidence = min(1.0, best_score + diff)
        return DetectedAnswer(
            question_number=question_num,
            selected_option=best_idx,
            selected_option_label=ANSWER_LABELS[best_idx],
            confidence_score=round(confidence, 4),
            status=AnswerStatus.DETECTED,
        )

    def _log_results(self, answers: List[DetectedAnswer], confidence: float):
        """Log results in formatted table."""
        logger.info("=" * 70)
        logger.info("RESPUESTAS DETECTADAS")
        logger.info("=" * 70)
        
        for i in range(0, len(answers), 10):
            row = answers[i:i+10]
            parts = []
            for a in row:
                label = a.selected_option_label or "-"
                status = "✓" if a.status == AnswerStatus.DETECTED else "?"
                parts.append(f"{a.question_number:2d}:{label}{status}")
            logger.info(" | ".join(parts))
        
        detected = sum(1 for a in answers if a.status == AnswerStatus.DETECTED)
        blank = sum(1 for a in answers if a.status == AnswerStatus.BLANK)
        other = len(answers) - detected - blank
        
        logger.info("=" * 70)
        logger.info(f"Detected: {detected} | Blank: {blank} | Ambiguous/Multiple: {other} | Confidence: {confidence:.2%}")
        logger.info("=" * 70)
