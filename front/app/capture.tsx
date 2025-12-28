import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
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

export default function CaptureScreen() {
  const router = useRouter();
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
    captureMode,
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

  // Auto-capture logic
  useEffect(() => {
    if (captureMode !== 'auto' || !detectionResult) return;

    const confidence = detectionResult.confidence;

    if (confidence >= ENV.AUTO_CAPTURE_CONFIDENCE) {
      if (!stableTime) {
        setStableTime(Date.now());
      } else if (Date.now() - stableTime >= ENV.STABILITY_DURATION) {
        // Auto capture
        handleCapture();
        setStableTime(null);
      }
    } else {
      setStableTime(null);
    }
  }, [detectionResult, captureMode, stableTime]);

  // Simulate document detection (in real app, this would use frame processor)
  useEffect(() => {
    if (cameraPermission !== 'granted') return;

    // Simulate detection updates
    const interval = setInterval(() => {
      // This is a simulation - in real implementation, 
      // use frame processor with document detection
      const mockConfidence = 0.5 + Math.random() * 0.5; // 50-100%

      setDetectionResult({
        corners: mockConfidence > 0.5 ? {
          topLeft: { x: dimensions.width * 0.1, y: dimensions.height * 0.2 },
          topRight: { x: dimensions.width * 0.9, y: dimensions.height * 0.2 },
          bottomLeft: { x: dimensions.width * 0.1, y: dimensions.height * 0.8 },
          bottomRight: { x: dimensions.width * 0.9, y: dimensions.height * 0.8 },
        } : null,
        confidence: mockConfidence,
        isStable: mockConfidence > 0.85,
        timestamp: Date.now(),
      });
    }, 500);

    return () => clearInterval(interval);
  }, [cameraPermission, dimensions, setDetectionResult]);

  const handleCapture = useCallback(async () => {
    const image = await captureImage();
    if (image) {
      router.push('/preview');
    } else {
      Alert.alert('Error', 'No se pudo capturar la imagen. Intente de nuevo.');
    }
  }, [captureImage, router]);

  const handleClose = () => {
    resetCaptureState();
    router.back();
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
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
        {/* Close button */}
        <SafeAreaView className="absolute top-0 left-0 right-0 flex-row justify-between p-4">
          <Button
            title=""
            icon={<Ionicons name="close" size={24} color="white" />}
            onPress={handleClose}
            variant="secondary"
            size="sm"
          />
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
