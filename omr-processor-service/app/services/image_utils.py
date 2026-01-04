"""Image utilities for OMR processing - inspired by OMRChecker."""

import cv2
import numpy as np
from typing import Optional, Tuple, List
import structlog

logger = structlog.get_logger()


class ImageUtils:
    """Utility class for image processing operations."""
    
    @staticmethod
    def normalize_util(image: np.ndarray) -> np.ndarray:
        """Normalize image to 0-255 range."""
        return cv2.normalize(image, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
    
    @staticmethod
    def resize_util(image: np.ndarray, width: int, height: Optional[int] = None) -> np.ndarray:
        """Resize image maintaining aspect ratio if height not provided."""
        if height is None:
            ratio = width / image.shape[1]
            height = int(image.shape[0] * ratio)
        return cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
    
    @staticmethod
    def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
        """Apply perspective transform using 4 points (corners)."""
        rect = ImageUtils.order_points(pts)
        (tl, tr, br, bl) = rect
        
        # Calculate new dimensions
        width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        max_width = max(int(width_a), int(width_b))
        
        height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        max_height = max(int(height_a), int(height_b))
        
        dst = np.array([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1]
        ], dtype=np.float32)
        
        matrix = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, matrix, (max_width, max_height))
        
        return warped
    
    @staticmethod
    def order_points(pts: np.ndarray) -> np.ndarray:
        """Order points: top-left, top-right, bottom-right, bottom-left."""
        rect = np.zeros((4, 2), dtype=np.float32)
        
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        
        return rect
    
    @staticmethod
    def adjust_gamma(image: np.ndarray, gamma: float = 1.0) -> np.ndarray:
        """Adjust image gamma for better contrast."""
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255
                         for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(image, table)


class MarkerDetector:
    """
    Detect markers in corners of OMR sheet for precise alignment.
    Based on OMRChecker's CropOnMarkers approach.
    """
    
    def __init__(
        self,
        min_matching_threshold: float = 0.3,
        max_matching_variation: float = 0.41,
        marker_rescale_range: Tuple[int, int] = (35, 100),
        marker_rescale_steps: int = 10,
    ):
        self.min_matching_threshold = min_matching_threshold
        self.max_matching_variation = max_matching_variation
        self.marker_rescale_range = marker_rescale_range
        self.marker_rescale_steps = marker_rescale_steps
    
    def create_default_marker(self, size: int = 50) -> np.ndarray:
        """Create a default square marker for template matching."""
        marker = np.ones((size, size), dtype=np.uint8) * 255
        # Draw a filled black square with white border
        border = size // 8
        marker[border:size-border, border:size-border] = 0
        return marker
    
    def find_markers_in_quadrants(
        self, 
        image: np.ndarray, 
        marker: Optional[np.ndarray] = None
    ) -> Optional[np.ndarray]:
        """
        Find markers in 4 quadrants of the image.
        Returns 4 corner points if found, None otherwise.
        """
        if marker is None:
            marker = self.create_default_marker()
        
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Normalize and apply CLAHE
        gray = ImageUtils.normalize_util(gray)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        
        # Apply erosion to enhance markers
        eroded = gray - cv2.erode(gray, kernel=np.ones((5, 5)), iterations=2)
        eroded = ImageUtils.normalize_util(eroded)
        
        h, w = eroded.shape[:2]
        midh, midw = h // 2, w // 2
        
        # Define quadrants
        quads = {
            0: (eroded[0:midh, 0:midw], (0, 0)),          # Top-left
            1: (eroded[0:midh, midw:w], (midw, 0)),       # Top-right
            2: (eroded[midh:h, 0:midw], (0, midh)),       # Bottom-left
            3: (eroded[midh:h, midw:w], (midw, midh)),    # Bottom-right
        }
        
        # Find best scale for marker
        best_scale = self._get_best_scale(eroded, marker)
        if best_scale is None:
            logger.warning("Could not find optimal marker scale")
            return None
        
        # Resize marker to optimal scale
        optimal_marker = cv2.resize(
            marker, 
            None, 
            fx=best_scale, 
            fy=best_scale, 
            interpolation=cv2.INTER_AREA
        )
        
        # Prepare marker for matching
        optimal_marker = ImageUtils.normalize_util(optimal_marker)
        optimal_marker = optimal_marker - cv2.erode(
            optimal_marker, 
            kernel=np.ones((5, 5)), 
            iterations=2
        )
        
        mh, mw = optimal_marker.shape[:2]
        centres = []
        
        for k in range(4):
            quad, origin = quads[k]
            
            # Template matching
            res = cv2.matchTemplate(quad, optimal_marker, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            
            if max_val < self.min_matching_threshold:
                logger.warning(f"Marker not found in quadrant {k+1}, max_val={max_val:.3f}")
                return None
            
            # Calculate center of found marker
            pt = (
                origin[0] + max_loc[0] + mw // 2,
                origin[1] + max_loc[1] + mh // 2
            )
            centres.append(pt)
        
        logger.info(f"Found all 4 markers at scale {best_scale:.2f}")
        return np.array(centres, dtype=np.float32)
    
    def _get_best_scale(self, image: np.ndarray, marker: np.ndarray) -> Optional[float]:
        """Find the best scale for the marker template."""
        best_scale = None
        best_val = 0
        
        step = (self.marker_rescale_range[1] - self.marker_rescale_range[0]) / self.marker_rescale_steps
        
        for scale_percent in np.arange(
            self.marker_rescale_range[1], 
            self.marker_rescale_range[0], 
            -step
        ):
            scale = scale_percent / 100.0
            if scale <= 0:
                continue
            
            rescaled = cv2.resize(marker, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            
            if rescaled.shape[0] > image.shape[0] or rescaled.shape[1] > image.shape[1]:
                continue
            
            # Prepare for matching
            rescaled = ImageUtils.normalize_util(rescaled)
            rescaled = rescaled - cv2.erode(rescaled, kernel=np.ones((5, 5)), iterations=2)
            
            res = cv2.matchTemplate(image, rescaled, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(res)
            
            if max_val > best_val:
                best_val = max_val
                best_scale = scale
        
        if best_val < self.min_matching_threshold:
            return None
        
        return best_scale


class AdaptiveThreshold:
    """
    Adaptive thresholding for bubble detection.
    Based on OMRChecker's global + local threshold approach.
    """
    
    @staticmethod
    def get_global_threshold(
        values: List[float], 
        looseness: float = 4.0
    ) -> Tuple[float, float, float]:
        """
        Calculate global threshold based on value distribution.
        Returns: (threshold, mean, std)
        """
        if not values:
            return 128.0, 128.0, 0.0
        
        arr = np.array(values)
        mean_val = np.mean(arr)
        std_val = np.std(arr)
        
        # Threshold is mean minus looseness * std
        # Lower values are "marked" bubbles
        threshold = mean_val - looseness * std_val
        
        # Clamp to reasonable range
        threshold = max(0, min(255, threshold))
        
        return float(threshold), float(mean_val), float(std_val)
    
    @staticmethod
    def get_local_threshold(
        row_values: List[float],
        global_threshold: float,
        no_outliers: bool = False,
        looseness: float = 2.0
    ) -> float:
        """
        Calculate local threshold for a single row of bubbles.
        """
        if not row_values or no_outliers:
            return global_threshold
        
        arr = np.array(row_values)
        mean_val = np.mean(arr)
        std_val = np.std(arr)
        
        # If std is very low, all bubbles look similar (all blank or all marked)
        if std_val < 10:
            return global_threshold
        
        # Local threshold
        local_threshold = mean_val - looseness * std_val
        
        # Blend with global threshold
        return (local_threshold + global_threshold) / 2
    
    @staticmethod
    def detect_marked_bubbles(
        gray_image: np.ndarray,
        row_regions: List[List[Tuple[int, int, int, int]]],  # List of rows, each row is list of (x, y, w, h)
    ) -> List[List[Tuple[int, float]]]:
        """
        Detect marked bubbles using adaptive thresholding.
        Returns list of rows, each containing (bubble_index, confidence) pairs.
        """
        all_values = []
        row_values_list = []
        
        # First pass: collect all intensity values
        for row in row_regions:
            row_values = []
            for x, y, w, h in row:
                region = gray_image[y:y+h, x:x+w]
                if region.size > 0:
                    mean_intensity = np.mean(region)
                    row_values.append(mean_intensity)
                    all_values.append(mean_intensity)
                else:
                    row_values.append(255)  # White = unmarked
            row_values_list.append(row_values)
        
        # Calculate global threshold
        global_thr, _, global_std = AdaptiveThreshold.get_global_threshold(all_values)
        
        # Calculate per-row std to detect uniform rows
        row_stds = [np.std(rv) if len(rv) > 1 else 0 for rv in row_values_list]
        global_std_thr, _, _ = AdaptiveThreshold.get_global_threshold(row_stds)
        
        results = []
        
        # Second pass: detect with adaptive threshold
        for row_idx, (row_values, row_std) in enumerate(zip(row_values_list, row_stds)):
            no_outliers = row_std < global_std_thr
            local_thr = AdaptiveThreshold.get_local_threshold(
                row_values, global_thr, no_outliers
            )
            
            marked_bubbles = []
            for bubble_idx, intensity in enumerate(row_values):
                # Lower intensity = darker = more likely marked
                is_marked = intensity < local_thr
                confidence = (local_thr - intensity) / local_thr if is_marked else 0
                confidence = max(0, min(1, confidence))
                marked_bubbles.append((bubble_idx, confidence if is_marked else 0))
            
            results.append(marked_bubbles)
        
        return results


class HorizontalLineDetector:
    """
    Detect horizontal lines in OMR sheet to dynamically adjust grid.
    This helps handle paper curvature by finding actual row positions.
    """
    
    @staticmethod
    def detect_row_positions(
        gray_image: np.ndarray,
        expected_rows: int = 30,
        min_line_width_ratio: float = 0.5
    ) -> List[int]:
        """
        Detect horizontal lines and return their Y positions.
        
        Args:
            gray_image: Grayscale image of the answer region
            expected_rows: Expected number of rows to find
            min_line_width_ratio: Minimum line width as ratio of image width
        
        Returns:
            List of Y positions for each detected row center
        """
        h, w = gray_image.shape[:2]
        
        # Apply morphological operations to enhance horizontal lines
        # Use a horizontal kernel to detect horizontal structures
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 4, 1))
        
        # Apply morphology to find horizontal lines
        morph = cv2.morphologyEx(gray_image, cv2.MORPH_OPEN, h_kernel)
        
        # Threshold
        _, binary = cv2.threshold(morph, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Find horizontal projection (sum of white pixels per row)
        projection = np.sum(binary, axis=1)
        
        # Normalize projection
        projection = projection / np.max(projection) if np.max(projection) > 0 else projection
        
        # Find peaks in projection (these are the row separators)
        # We look for valleys actually (where there are lines/gaps between rows)
        min_distance = h // (expected_rows + 5)  # Minimum distance between rows
        
        # Find row centers by detecting transitions
        row_positions = HorizontalLineDetector._find_row_centers_from_projection(
            projection, expected_rows, min_distance
        )
        
        if len(row_positions) == expected_rows:
            logger.info(f"Detected {len(row_positions)} row positions dynamically")
            return row_positions
        
        # Fallback: use uniform distribution if detection fails
        logger.warning(f"Dynamic row detection found {len(row_positions)} rows, expected {expected_rows}. Using uniform distribution.")
        return HorizontalLineDetector._uniform_row_positions(h, expected_rows)
    
    @staticmethod
    def _find_row_centers_from_projection(
        projection: np.ndarray,
        expected_rows: int,
        min_distance: int
    ) -> List[int]:
        """Find row centers from horizontal projection."""
        h = len(projection)
        
        # Smooth the projection to reduce noise
        kernel_size = max(3, h // 100)
        if kernel_size % 2 == 0:
            kernel_size += 1
        smoothed = np.convolve(projection, np.ones(kernel_size) / kernel_size, mode='same')
        
        # Find local maxima (row areas) and minima (separators)
        # We want to find where the content is (maxima = rows with bubbles)
        
        # Use gradient to find transitions
        gradient = np.gradient(smoothed)
        
        # Find zero crossings (transitions between rows)
        crossings = []
        for i in range(1, len(gradient)):
            if gradient[i-1] > 0 and gradient[i] <= 0:  # Positive to negative = peak
                crossings.append(i)
        
        # Filter crossings by minimum distance
        filtered = []
        for c in crossings:
            if not filtered or (c - filtered[-1]) >= min_distance:
                filtered.append(c)
        
        if len(filtered) < expected_rows:
            # Not enough rows found, try different approach
            return HorizontalLineDetector._find_rows_by_intensity(projection, expected_rows)
        
        # Take the expected number of most prominent peaks
        return filtered[:expected_rows]
    
    @staticmethod
    def _find_rows_by_intensity(
        projection: np.ndarray,
        expected_rows: int
    ) -> List[int]:
        """Alternative method: divide into expected rows and find center of each."""
        h = len(projection)
        row_height = h / expected_rows
        
        row_positions = []
        for i in range(expected_rows):
            start = int(i * row_height)
            end = int((i + 1) * row_height)
            
            # Find the center of mass of this section
            section = projection[start:end]
            if np.sum(section) > 0:
                # Weighted center
                indices = np.arange(len(section))
                center = int(start + np.average(indices, weights=section + 0.001))
            else:
                center = int(start + row_height / 2)
            
            row_positions.append(center)
        
        return row_positions
    
    @staticmethod
    def _uniform_row_positions(height: int, num_rows: int) -> List[int]:
        """Generate uniform row positions (fallback)."""
        row_height = height / num_rows
        return [int((i + 0.5) * row_height) for i in range(num_rows)]
    
    @staticmethod
    def detect_column_separators(
        gray_image: np.ndarray,
        expected_cols: int = 3
    ) -> List[int]:
        """
        Detect vertical column separators.
        
        Returns:
            List of X positions for column boundaries (including start and end)
        """
        h, w = gray_image.shape[:2]
        
        # Use vertical kernel to detect vertical lines
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h // 4))
        morph = cv2.morphologyEx(gray_image, cv2.MORPH_OPEN, v_kernel)
        
        # Threshold
        _, binary = cv2.threshold(morph, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Vertical projection
        projection = np.sum(binary, axis=0)
        
        # Find peaks (column separators are usually dark vertical lines)
        # But for now, use uniform distribution as fallback
        col_width = w / expected_cols
        return [int(i * col_width) for i in range(expected_cols + 1)]
    
    @staticmethod
    def get_adaptive_grid(
        gray_image: np.ndarray,
        num_cols: int = 3,
        rows_per_col: int = 30
    ) -> Tuple[List[int], List[List[int]]]:
        """
        Get adaptive grid based on detected lines.
        
        Returns:
            Tuple of (column_boundaries, row_positions_per_column)
            - column_boundaries: List of X positions for column edges
            - row_positions_per_column: List of Lists, each containing Y positions for each column
        """
        h, w = gray_image.shape[:2]
        
        # Detect column separators (usually uniform for printed forms)
        col_boundaries = HorizontalLineDetector.detect_column_separators(gray_image, num_cols)
        
        # For each column, detect row positions independently
        # This helps when there's curvature that differs across columns
        row_positions_per_col = []
        
        for col_idx in range(num_cols):
            col_start = col_boundaries[col_idx]
            col_end = col_boundaries[col_idx + 1] if col_idx + 1 < len(col_boundaries) else w
            
            # Extract column region
            col_region = gray_image[:, col_start:col_end]
            
            # Detect rows in this column
            row_positions = HorizontalLineDetector.detect_row_positions(col_region, rows_per_col)
            row_positions_per_col.append(row_positions)
        
        logger.info(f"Adaptive grid: {num_cols} columns, {rows_per_col} rows each")
        return col_boundaries, row_positions_per_col

