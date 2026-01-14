/**
 * useSheetDetection Hook
 * 
 * Hook que maneja el pipeline de detección de fichas ópticas
 * usando react-native-vision-camera con frame processors y OpenCV.
 * 
 * NOTA: Este hook solo funciona en plataformas nativas (iOS/Android).
 * En web, retorna valores por defecto sin funcionalidad.
 */

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { DEFAULT_DETECTOR_CONFIG } from '../../domain/services/sheetDetector';
import type { DetectedSheet, SheetCorners, DetectorConfig, DetectorState } from '../../domain/entities/DetectedSheet';

// Imports condicionales para módulos nativos
let useFrameProcessor: any = null;
let useSharedValue: any = null;
let useRunInJS: any = null;
let OpenCV: any = null;
let detectSheetFrame: any = null;
let isDetectionStable: any = null;

if (Platform.OS !== 'web') {
  try {
    const visionCamera = require('react-native-vision-camera');
    useFrameProcessor = visionCamera.useFrameProcessor;
    
    const worklets = require('react-native-worklets-core');
    useSharedValue = worklets.useSharedValue;
    useRunInJS = worklets.useRunInJS;
    
    const fastOpencv = require('react-native-fast-opencv');
    OpenCV = fastOpencv.OpenCV;
    
    const detector = require('../../domain/services/sheetDetector');
    detectSheetFrame = detector.detectSheetFrame;
    isDetectionStable = detector.isDetectionStable;
  } catch (e) {
    console.warn('Native detection modules not available:', e);
  }
}

interface UseSheetDetectionOptions {
  /** Callback cuando se dispara auto-captura */
  onAutoCapture?: () => void;
  /** Configuración personalizada del detector */
  config?: Partial<DetectorConfig>;
  /** Si el detector está activo */
  isActive?: boolean;
}

interface UseSheetDetectionReturn {
  /** Estado actual del detector */
  state: DetectorState;
  /** Última detección */
  detection: DetectedSheet | null;
  /** Frame processor para pasar a la Camera */
  frameProcessor: any;
  /** Reiniciar el detector */
  reset: () => void;
  /** Esquinas detectadas (para overlay) */
  corners: SheetCorners | null;
  /** Confianza actual 0-1 */
  confidence: number;
  /** Contador de frames estables */
  stableFrames: number;
}

// Hook dummy para web
function useSheetDetectionWeb(_options: UseSheetDetectionOptions = {}): UseSheetDetectionReturn {
  return {
    state: 'idle',
    detection: null,
    frameProcessor: undefined,
    reset: () => {},
    corners: null,
    confidence: 0,
    stableFrames: 0,
  };
}

// Hook real para native
function useSheetDetectionNative({
  onAutoCapture,
  config: customConfig,
  isActive = true,
}: UseSheetDetectionOptions = {}): UseSheetDetectionReturn {
  // Merge configuración
  const config: DetectorConfig = {
    ...DEFAULT_DETECTOR_CONFIG,
    ...customConfig,
  };

  // Estado de React
  const [state, setState] = useState<DetectorState>('idle');
  const [detection, setDetection] = useState<DetectedSheet | null>(null);
  const [corners, setCorners] = useState<SheetCorners | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [stableFrames, setStableFrames] = useState(0);

  // Shared values para comunicación con worklet
  const lastProcessTime = useSharedValue(0);
  const stableCounter = useSharedValue(0);
  const previousCorners = useSharedValue<SheetCorners | null>(null);
  const autoCaptureTriggered = useSharedValue(false);

  // Intervalo entre frames basado en FPS
  const frameInterval = 1000 / config.fps;

  // Funciones para ejecutar en JS desde worklet
  const runUpdateDetection = useRunInJS((result: DetectedSheet) => {
    setDetection(result);
    setCorners(result.corners);
    setConfidence(result.confidence);
    
    if (result.detected) {
      setState('detecting');
    } else {
      setState('idle');
    }
  }, []);

  const runUpdateStableCount = useRunInJS((count: number) => {
    setStableFrames(count);
    if (count >= config.stableFramesThreshold) {
      setState('stable');
    }
  }, [config.stableFramesThreshold]);

  const runTriggerAutoCapture = useRunInJS(() => {
    setState('captured');
    onAutoCapture?.();
  }, [onAutoCapture]);

  // Reset del detector
  const reset = useCallback(() => {
    setState('idle');
    setDetection(null);
    setCorners(null);
    setConfidence(0);
    setStableFrames(0);
    stableCounter.value = 0;
    previousCorners.value = null;
    autoCaptureTriggered.value = false;
  }, [stableCounter, previousCorners, autoCaptureTriggered]);

  // Frame Processor principal
  const frameProcessor = useFrameProcessor((frame: any) => {
    'worklet';
    
    if (!isActive) return;
    
    const now = Date.now();
    
    // Throttle basado en FPS configurado
    if (now - lastProcessTime.value < frameInterval) {
      return;
    }
    lastProcessTime.value = now;
    
    // Detectar ficha en el frame
    const result = detectSheetFrame(frame, OpenCV, config);
    
    // Actualizar UI (en thread principal)
    runUpdateDetection(result);
    
    if (result.detected && result.corners) {
      // Verificar estabilidad
      const isStable = isDetectionStable(result.corners, previousCorners.value);
      
      if (isStable) {
        stableCounter.value++;
        runUpdateStableCount(stableCounter.value);
        
        // Auto-captura después de N frames estables
        if (stableCounter.value >= config.stableFramesThreshold && !autoCaptureTriggered.value) {
          autoCaptureTriggered.value = true;
          runTriggerAutoCapture();
        }
      } else {
        stableCounter.value = 0;
        runUpdateStableCount(0);
      }
      
      previousCorners.value = result.corners;
    } else {
      stableCounter.value = 0;
      previousCorners.value = null;
      runUpdateStableCount(0);
    }
  }, [isActive, frameInterval, config, runUpdateDetection, runUpdateStableCount, runTriggerAutoCapture]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    state,
    detection,
    frameProcessor,
    reset,
    corners,
    confidence,
    stableFrames,
  };
}

// Export: usa el hook correcto según la plataforma
export const useSheetDetection = Platform.OS === 'web' || !useFrameProcessor
  ? useSheetDetectionWeb
  : useSheetDetectionNative;
