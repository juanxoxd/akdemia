import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraOverlay } from '../src/presentation/components/camera/CameraOverlay';
import { CameraControls } from '../src/presentation/components/camera/CameraControls';
import { Button } from '../src/presentation/components/common/Button';
import { LoadingSpinner } from '../src/presentation/components/common/LoadingSpinner';
import { useCamera } from '../src/presentation/hooks/useCamera';
import { useCaptureStore } from '../src/store';
import { ENV } from '../src/config/env';

// Capture modes passed via URL params
type CaptureMode = 'student' | 'answer-key';

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; examId?: string }>();

  // Determine capture purpose from URL params
  const captureFor: CaptureMode = params.mode === 'answer-key' ? 'answer-key' : 'student';
  const examId = params.examId;

  const {
    cameraRef,
    cameraPermission,
    cameraFacing,
    flashEnabled,
    requestPermission,
    captureImage,
    toggleCameraFacing,
    toggleFlash,
    onCameraReady,
  } = useCamera();

  const {
    detectionResult,
    captureMode, // auto or manual
    isProcessingImage,
    setCaptureMode,
    setDetectionResult,
    resetCaptureState,
  } = useCaptureStore();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stableTime, setStableTime] = useState<number | null>(null);

  // Request camera permission on mount
  useEffect(() => {
    if (cameraPermission === 'undetermined') {
      requestPermission();
    }
  }, [cameraPermission, requestPermission]);

  // Auto-capture logic: triggers when stable at high confidence
  useEffect(() => {
    if (captureMode !== 'auto' || !detectionResult) return;

    const { confidence } = detectionResult;
    const isHighConfidence = confidence >= ENV.AUTO_CAPTURE_CONFIDENCE;

    if (isHighConfidence) {
      // Start stability timer
      if (!stableTime) {
        setStableTime(Date.now());
      } else if (Date.now() - stableTime >= ENV.STABILITY_DURATION) {
        handleCapture();
        setStableTime(null);
      }
    } else {
      // Reset timer if confidence drops
      setStableTime(null);
    }
  }, [detectionResult, captureMode, stableTime]);

  // Simulate document detection (in real app, use frame processor)
  useEffect(() => {
    if (cameraPermission !== 'granted') return;

    let confidence = ENV.DETECTION_MIN_CONFIDENCE;

    const interval = setInterval(() => {
      // Calculate confidence change with bias towards increasing
      const randomFactor = Math.random() + ENV.DETECTION_DELTA_BIAS;
      const delta = randomFactor * ENV.DETECTION_DELTA_RANGE;

      // Update confidence within bounds
      confidence = Math.max(
        ENV.DETECTION_MIN_CONFIDENCE,
        Math.min(1.0, confidence + delta)
      );

      // Once stable (high confidence), reduce variance
      if (confidence > ENV.DETECTION_STABLE_THRESHOLD) {
        const stableAdjustment = (Math.random() - 0.2) * ENV.DETECTION_STABLE_VARIANCE;
        confidence = Math.max(
          ENV.DETECTION_STABLE_THRESHOLD,
          confidence + stableAdjustment
        );
      }

      // Calculate frame corners based on screen dimensions
      const showOverlay = confidence > ENV.OVERLAY_CONFIDENCE_THRESHOLD;
      const corners = showOverlay ? {
        topLeft: {
          x: dimensions.width * ENV.FRAME_MARGIN_HORIZONTAL,
          y: dimensions.height * ENV.FRAME_MARGIN_TOP
        },
        topRight: {
          x: dimensions.width * (1 - ENV.FRAME_MARGIN_HORIZONTAL),
          y: dimensions.height * ENV.FRAME_MARGIN_TOP
        },
        bottomLeft: {
          x: dimensions.width * ENV.FRAME_MARGIN_HORIZONTAL,
          y: dimensions.height * (1 - ENV.FRAME_MARGIN_BOTTOM)
        },
        bottomRight: {
          x: dimensions.width * (1 - ENV.FRAME_MARGIN_HORIZONTAL),
          y: dimensions.height * (1 - ENV.FRAME_MARGIN_BOTTOM)
        },
      } : null;

      setDetectionResult({
        corners,
        confidence,
        isStable: confidence > ENV.DETECTION_STABLE_THRESHOLD,
        timestamp: Date.now(),
      });
    }, ENV.DETECTION_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [cameraPermission, dimensions, setDetectionResult]);

  // Handle capture and navigate to appropriate screen
  const handleCapture = useCallback(async () => {
    const image = await captureImage();

    if (image) {
      if (captureFor === 'answer-key' && examId) {
        // Navigate to answer-key preview with captured image
        router.push({
          pathname: '/preview',
          params: { mode: 'answer-key', examId }
        } as any);
      } else {
        // Default: navigate to student answer preview
        router.push('/preview');
      }
    } else {
      Alert.alert('Error', 'No se pudo capturar la imagen. Intente de nuevo.');
    }
  }, [captureImage, router, captureFor, examId]);

  const handleClose = () => {
    resetCaptureState();
    router.back();
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  // Get title based on capture mode
  const getTitle = () => {
    return captureFor === 'answer-key' ? 'Capturar Answer Key' : 'Capturar Hoja de Respuestas';
  };

  // Permission denied
  if (cameraPermission === 'denied') {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center p-6">
        <Ionicons name="videocam-off-outline" size={64} color="#ef4444" />
        <Text className="text-white text-xl font-semibold mt-6 text-center">
          Permiso de Cámara Denegado
        </Text>
        <Text className="text-gray-400 text-center mt-4 px-4">
          Para escanear hojas de respuestas, necesitamos acceso a la cámara de tu dispositivo.
        </Text>
        <View className="mt-8 w-full gap-4">
          <Button
            title="Abrir Configuración"
            onPress={handleOpenSettings}
            variant="primary"
            fullWidth
          />
          <Button
            title="Volver"
            onPress={handleClose}
            variant="outline"
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  // Loading permission
  if (cameraPermission === 'undetermined') {
    return (
      <View className="flex-1 bg-black">
        <LoadingSpinner fullScreen message="Solicitando permisos..." />
      </View>
    );
  }

  const canAutoCapture =
    detectionResult?.confidence !== undefined &&
    detectionResult.confidence >= ENV.AUTO_CAPTURE_CONFIDENCE;

  return (
    <View
      className="flex-1 bg-black"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setDimensions({ width, height });
      }}
    >
      {/* Camera view */}
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={cameraFacing}
        flash={flashEnabled ? 'on' : 'off'}
        onCameraReady={onCameraReady}
      >
        {/* Header with close button and title */}
        <SafeAreaView className="absolute top-0 left-0 right-0 flex-row justify-between items-center p-4">
          <Button
            title=""
            icon={<Ionicons name="close" size={24} color="white" />}
            onPress={handleClose}
            variant="secondary"
            size="sm"
          />
          {captureFor === 'answer-key' && (
            <View className="bg-blue-600/80 px-3 py-1 rounded-full">
              <Text className="text-white text-sm font-medium">Answer Key</Text>
            </View>
          )}
          <View style={{ width: 40 }} />
        </SafeAreaView>

        {/* Detection overlay */}
        <CameraOverlay
          corners={detectionResult?.corners || null}
          confidence={detectionResult?.confidence || 0}
          frameWidth={dimensions.width}
          frameHeight={dimensions.height}
        />

        {/* Processing overlay */}
        {isProcessingImage && (
          <View className="absolute inset-0 bg-black/70 items-center justify-center">
            <LoadingSpinner message="Procesando imagen..." />
          </View>
        )}

        {/* Camera controls */}
        <CameraControls
          captureMode={captureMode}
          flashEnabled={flashEnabled}
          cameraFacing={cameraFacing}
          isCapturing={isProcessingImage}
          canAutoCapture={canAutoCapture}
          onCapture={handleCapture}
          onToggleFlash={toggleFlash}
          onToggleFacing={toggleCameraFacing}
          onToggleMode={() => setCaptureMode(captureMode === 'auto' ? 'manual' : 'auto')}
        />
      </CameraView>
    </View>
  );
}
