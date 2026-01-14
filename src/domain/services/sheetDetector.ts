/**
 * Sheet Detector Service
 * 
 * Worklet que procesa frames de cámara con OpenCV nativo para detectar
 * cuadriláteros de fichas ópticas usando Canny + contornos + approxPolyDP.
 * 
 * IMPORTANTE: OpenCV no tiene garbage collection. 
 * Todos los Mat deben ser liberados manualmente con .delete()
 * 
 * NOTA: Este archivo contiene funciones worklet que solo funcionan en native.
 */

import { Platform } from 'react-native';
import type { SheetCorners, FrameQuality, DetectedSheet, DetectorConfig } from '../entities/DetectedSheet';
import type { Point } from '../entities/Detection';

// Configuración por defecto
export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  fps: 4,
  minContourAreaRatio: 0.15,
  maxContourAreaRatio: 0.85,
  approxPolyEpsilon: 0.02,
  stableFramesThreshold: 6, // 1.5s a 4 FPS
  blurThreshold: 100,
};

/**
 * Ordena 4 puntos en sentido horario empezando por topLeft
 * topLeft → topRight → bottomRight → bottomLeft
 */
export function orderCorners(points: Point[]): SheetCorners {
  'worklet';
  
  if (points.length !== 4) {
    throw new Error('Se requieren exactamente 4 puntos');
  }

  // Ordenar por suma y diferencia de coordenadas
  const sorted = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  
  const topLeft = sorted[0];
  const bottomRight = sorted[3];
  
  // De los 2 puntos restantes, el que tiene menor diferencia x-y es topRight
  const remaining = [sorted[1], sorted[2]].sort((a, b) => (a.y - a.x) - (b.y - b.x));
  const topRight = remaining[0];
  const bottomLeft = remaining[1];

  return { topLeft, topRight, bottomRight, bottomLeft };
}

/**
 * Detecta una ficha óptica en el frame usando OpenCV.
 * Este es el frame processor worklet principal.
 * 
 * @param frame - Frame de la cámara
 * @param opencv - Objeto OpenCV de react-native-fast-opencv
 * @param config - Configuración del detector
 * @returns DetectedSheet con las esquinas si se encontró un cuadrilátero
 */
export function detectSheetFrame(
  frame: any,
  opencv: any,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG
): DetectedSheet {
  'worklet';
  
  // En web, retornar detección vacía
  if (Platform.OS === 'web') {
    return {
      detected: false,
      corners: null,
      confidence: 0,
      quality: { blur: 0, brightness: 0.5 },
      timestamp: Date.now(),
    };
  }
  
  const startTime = Date.now();
  
  // Objeto para acumular recursos a liberar
  const resources: any[] = [];
  
  const addResource = (resource: any) => {
    if (resource) resources.push(resource);
    return resource;
  };
  
  try {
    // 1. Convertir frame a Mat
    const mat = addResource(opencv.frameBufferToMat(frame));
    const frameArea = mat.rows * mat.cols;
    const minArea = frameArea * config.minContourAreaRatio;
    const maxArea = frameArea * config.maxContourAreaRatio;
    
    // 2. Convertir a escala de grises
    const gray = addResource(opencv.cvtColor(mat, opencv.ColorConversionCodes.COLOR_BGR2GRAY));
    
    // 3. Calcular calidad del frame (nitidez aproximada)
    let blurValue = 0;
    try {
      const laplacian = addResource(opencv.Laplacian(gray, opencv.DataTypes.CV_64F));
      const meanStd = opencv.meanStdDev(laplacian);
      blurValue = Math.pow(meanStd.stddev[0] || 0, 2);
    } catch {
      blurValue = 100;
    }
    
    const mean = opencv.mean(gray);
    const brightness = (mean[0] || 128) / 255;
    
    const quality: FrameQuality = {
      blur: blurValue,
      brightness,
    };
    
    // 4. Aplicar blur gaussiano para reducir ruido
    const blurred = addResource(opencv.GaussianBlur(gray, { width: 5, height: 5 }, 0));
    
    // 5. Detectar bordes con Canny
    const edges = addResource(opencv.Canny(blurred, 50, 150));
    
    // 6. Dilatar para cerrar gaps en bordes
    const kernel = addResource(opencv.getStructuringElement(
      opencv.MorphShapes.MORPH_RECT, 
      { width: 3, height: 3 }
    ));
    const dilated = addResource(opencv.dilate(edges, kernel));
    
    // 7. Encontrar contornos
    const contoursResult = opencv.findContours(
      dilated, 
      opencv.RetrievalModes.RETR_EXTERNAL, 
      opencv.ContourApproximationModes.CHAIN_APPROX_SIMPLE
    );
    const contours = contoursResult.contours;
    
    // 8. Buscar el contorno más grande que sea un cuadrilátero
    let bestContour: SheetCorners | null = null;
    let bestArea = 0;
    
    for (let i = 0; i < contours.length; i++) {
      const contour = contours[i];
      const area = opencv.contourArea(contour);
      
      if (area > minArea && area < maxArea && area > bestArea) {
        // Calcular perímetro y aproximar a polígono
        const perimeter = opencv.arcLength(contour, true);
        const epsilon = config.approxPolyEpsilon * perimeter;
        
        const approx = addResource(opencv.approxPolyDP(contour, epsilon, true));
        
        // Verificar que sea un cuadrilátero (4 lados)
        const approxPoints = opencv.matToArray(approx);
        if (approxPoints.length === 4) {
          // Extraer los 4 puntos
          const points: Point[] = approxPoints.map((p: number[]) => ({
            x: p[0],
            y: p[1],
          }));
          
          // Verificar que sea convexo
          if (opencv.isContourConvex(approx)) {
            bestContour = orderCorners(points);
            bestArea = area;
          }
        }
      }
    }
    
    // Calcular confianza basada en área y calidad
    const confidence = bestContour 
      ? Math.min(1, (bestArea / (frameArea * 0.5)) * (blurValue > config.blurThreshold ? 1 : 0.7))
      : 0;
    
    return {
      detected: bestContour !== null,
      corners: bestContour,
      confidence,
      quality,
      timestamp: startTime,
    };
    
  } finally {
    // CRÍTICO: Liberar TODOS los recursos de OpenCV
    for (const resource of resources) {
      try {
        resource?.delete?.();
      } catch {
        // Ignorar errores de cleanup
      }
    }
  }
}

/**
 * Verifica si la detección es estable comparando con la anterior.
 * Retorna true si las esquinas no han cambiado significativamente.
 */
export function isDetectionStable(
  current: SheetCorners | null,
  previous: SheetCorners | null,
  threshold: number = 10
): boolean {
  'worklet';
  
  if (!current || !previous) return false;
  
  const corners = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const;
  
  for (const corner of corners) {
    const curr = current[corner];
    const prev = previous[corner];
    
    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
    
    if (distance > threshold) {
      return false;
    }
  }
  
  return true;
}
