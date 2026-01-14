import { Point, DetectedCorners } from './Detection';

/**
 * Re-exporta DetectedCorners como SheetCorners para claridad semántica
 */
export type SheetCorners = DetectedCorners;

/**
 * Información de calidad del frame actual
 */
export interface FrameQuality {
  /** Varianza del Laplacian (mayor = más nítido) */
  blur: number;
  /** Brillo promedio 0-1 */
  brightness: number;
}

/**
 * Resultado de la detección de una ficha óptica
 */
export interface DetectedSheet {
  /** Si se encontró un cuadrilátero válido */
  detected: boolean;
  /** Las 4 esquinas, null si no detectado */
  corners: SheetCorners | null;
  /** Confianza de la detección 0-1 */
  confidence: number;
  /** Métricas de calidad del frame */
  quality: FrameQuality;
  /** Timestamp de la detección */
  timestamp: number;
}

/**
 * Estado del detector de fichas
 */
export type DetectorState = 'idle' | 'detecting' | 'stable' | 'captured';

/**
 * Configuración del detector
 */
export interface DetectorConfig {
  /** FPS de procesamiento (recomendado: 4) */
  fps: number;
  /** Área mínima del contorno (ratio del frame) */
  minContourAreaRatio: number;
  /** Área máxima del contorno (ratio del frame) */
  maxContourAreaRatio: number;
  /** Epsilon para approxPolyDP */
  approxPolyEpsilon: number;
  /** Frames estables antes de auto-captura */
  stableFramesThreshold: number;
  /** Umbral de blur para calidad */
  blurThreshold: number;
}
