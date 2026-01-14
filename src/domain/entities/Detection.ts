export interface Point {
  x: number;
  y: number;
}

export interface DetectedCorners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export interface DetectionResult {
  corners: DetectedCorners | null;
  confidence: number;
  isStable: boolean;
  timestamp: number;
}

export interface CapturedImage {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  sizeInMB: number;
}
