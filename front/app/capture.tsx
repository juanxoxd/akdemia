import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, Alert, Linking, Image, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DeviceMotion } from 'expo-sensors';
import { CameraOverlay } from '../src/presentation/components/camera/CameraOverlay';
import { CameraControls } from '../src/presentation/components/camera/CameraControls';
import { Button } from '../src/presentation/components/common/Button';
import { LoadingSpinner } from '../src/presentation/components/common/LoadingSpinner';
import { useCamera } from '../src/presentation/hooks/useCamera';
import { useCaptureStore } from '../src/store';
import { ENV } from '../src/config/env';
import { CapturedImage } from '../src/domain/entities';

type CaptureFor = 'student' | 'answer-key';

// Sensor configuration
const SENSOR_CONFIG = {
  UPDATE_INTERVAL: 100,
  FLAT_TOLERANCE: 0.4, // radians (~23 degrees) - more lenient
  STILL_TOLERANCE: 0.3, // acceleration magnitude - more lenient
  STABILITY_DURATION: 1000, // 1 second for auto-capture
  CAPTURE_COOLDOWN: 2000,
};

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; examId?: string }>();

  const captureFor: CaptureFor = params.mode === 'answer-key' ? 'answer-key' : 'student';
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
    captureMode,
    isProcessingImage,
    setCaptureMode,
    resetCaptureState,
  } = useCaptureStore();

  const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });
  const [previewImage, setPreviewImage] = useState<CapturedImage | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [sensorAvailable, setSensorAvailable] = useState(true);

  const lastCaptureTime = useRef<number>(0);
  const stabilityTimer = useRef<NodeJS.Timeout | null>(null);
  const stableStartTime = useRef<number | null>(null);

  // Request camera permission
  useEffect(() => {
    if (cameraPermission === 'undetermined') {
      requestPermission();
    }
  }, [cameraPermission, requestPermission]);

  // Check if DeviceMotion is available
  useEffect(() => {
    DeviceMotion.isAvailableAsync().then((available) => {
      console.log('DeviceMotion available:', available);
      setSensorAvailable(available);
      if (!available) {
        // Set a baseline confidence if sensors aren't available
        setConfidence(0.5);
      }
    });
  }, []);

  // Device motion sensor for auto-capture
  useEffect(() => {
    if (cameraPermission !== 'granted' || showConfirmation) return;
    if (!sensorAvailable) return;
    if (captureMode !== 'auto') {
      setConfidence(0.6); // Medium confidence for manual mode
      return;
    }

    console.log('Starting DeviceMotion sensor...');
    DeviceMotion.setUpdateInterval(SENSOR_CONFIG.UPDATE_INTERVAL);

    const subscription = DeviceMotion.addListener((motionData) => {
      if (!motionData.rotation) {
        console.log('No rotation data');
        return;
      }

      // Check if phone is flat (beta and gamma near 0)
      const beta = Math.abs(motionData.rotation.beta ?? 0);
      const gamma = Math.abs(motionData.rotation.gamma ?? 0);
      const isFlat = beta < SENSOR_CONFIG.FLAT_TOLERANCE && gamma < SENSOR_CONFIG.FLAT_TOLERANCE;

      // Check if phone is still (low acceleration) - use optional chaining
      const acc = motionData.acceleration;
      const accX = Math.abs(acc?.x ?? 0);
      const accY = Math.abs(acc?.y ?? 0);
      const accZ = Math.abs(acc?.z ?? 0);
      const totalAcceleration = accX + accY + accZ;
      const isStill = totalAcceleration < SENSOR_CONFIG.STILL_TOLERANCE;

      // Calculate confidence
      let newConfidence = 0.2; // Baseline
      if (isFlat) newConfidence += 0.4;
      if (isStill) newConfidence += 0.4;
      newConfidence = Math.min(newConfidence, 1.0);

      setConfidence(newConfidence);
    });

    return () => {
      console.log('Stopping DeviceMotion sensor');
      subscription.remove();
    };
  }, [cameraPermission, captureMode, sensorAvailable, showConfirmation]);

  // Update confidence for manual mode or when sensors unavailable
  useEffect(() => {
    if (captureMode === 'manual' || !sensorAvailable) {
      setConfidence(0.6);
    }
  }, [captureMode, sensorAvailable]);

  // Auto-capture trigger based on confidence
  useEffect(() => {
    if (captureMode !== 'auto' || isProcessingImage || showConfirmation) return;

    const isReady = confidence >= 0.9;

    if (isReady) {
      if (!stableStartTime.current) {
        stableStartTime.current = Date.now();
      }

      const stableDuration = Date.now() - stableStartTime.current;

      if (stableDuration >= SENSOR_CONFIG.STABILITY_DURATION) {
        console.log('Auto-capturing after stability duration');
        handleCapture();
        stableStartTime.current = null;
      }
    } else {
      stableStartTime.current = null;
    }
  }, [confidence, captureMode, isProcessingImage, showConfirmation]);

  // Calculate corners for the overlay (always calculate, regardless of detection)
  const getFrameCorners = () => {
    if (screenDimensions.width === 0 || screenDimensions.height === 0) return null;

    return {
      topLeft: {
        x: screenDimensions.width * ENV.FRAME_MARGIN_HORIZONTAL,
        y: screenDimensions.height * ENV.FRAME_MARGIN_TOP
      },
      topRight: {
        x: screenDimensions.width * (1 - ENV.FRAME_MARGIN_HORIZONTAL),
        y: screenDimensions.height * ENV.FRAME_MARGIN_TOP
      },
      bottomLeft: {
        x: screenDimensions.width * ENV.FRAME_MARGIN_HORIZONTAL,
        y: screenDimensions.height * (1 - ENV.FRAME_MARGIN_BOTTOM)
      },
      bottomRight: {
        x: screenDimensions.width * (1 - ENV.FRAME_MARGIN_HORIZONTAL),
        y: screenDimensions.height * (1 - ENV.FRAME_MARGIN_BOTTOM)
      },
    };
  };

  // Handle capture
  const handleCapture = useCallback(async () => {
    const now = Date.now();
    if (now - lastCaptureTime.current < SENSOR_CONFIG.CAPTURE_COOLDOWN) return;
    lastCaptureTime.current = now;
    stableStartTime.current = null;

    try {
      const image = await captureImage();
      if (image) {
        setPreviewImage(image);
        setShowConfirmation(true);
      } else {
        Alert.alert('Error', 'No se pudo capturar. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Fallo en la captura.');
    }
  }, [captureImage]);

  // Confirm and proceed
  const handleConfirmCapture = useCallback(() => {
    setShowConfirmation(false);

    if (captureFor === 'answer-key' && examId) {
      router.push({
        pathname: '/preview',
        params: { mode: 'answer-key', examId }
      } as any);
    } else {
      router.push('/preview');
    }
  }, [router, captureFor, examId]);

  // Retry capture
  const handleRetryCapture = useCallback(() => {
    setPreviewImage(null);
    setShowConfirmation(false);
    lastCaptureTime.current = 0;
    stableStartTime.current = null;
  }, []);

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
          Para escanear hojas de respuestas, necesitamos acceso a la cámara.
        </Text>
        <View className="mt-8 w-full gap-4">
          <Button title="Abrir Configuración" onPress={handleOpenSettings} variant="primary" fullWidth />
          <Button title="Volver" onPress={handleClose} variant="outline" fullWidth />
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

  // CONFIRMATION SCREEN
  if (showConfirmation && previewImage) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 p-4">
          <View className="flex-1 rounded-2xl overflow-hidden bg-gray-900">
            <Image
              source={{ uri: previewImage.uri }}
              style={{ flex: 1 }}
              resizeMode="contain"
            />
          </View>
        </View>

        <View className="absolute top-0 left-0 right-0">
          <SafeAreaView className="px-4 py-2">
            <View className="flex-row items-center justify-center bg-black/60 rounded-full px-4 py-2 self-center">
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text className="text-white font-semibold ml-2">¿La foto está correcta?</Text>
            </View>
          </SafeAreaView>
        </View>

        <View className="px-4 pb-6">
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={handleRetryCapture}
              className="flex-1 bg-gray-700 rounded-2xl py-4 flex-row items-center justify-center"
            >
              <Ionicons name="refresh" size={24} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmCapture}
              className="flex-1 bg-green-600 rounded-2xl py-4 flex-row items-center justify-center"
            >
              <Ionicons name="checkmark" size={24} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">Confirmar</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-4 flex-row justify-center">
            <Text className="text-gray-400 text-sm">
              {previewImage.width} × {previewImage.height}px • {previewImage.sizeInMB.toFixed(2)} MB
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const corners = getFrameCorners();
  const canAutoCapture = confidence >= 0.9;

  // CAMERA SCREEN
  return (
    <View
      className="flex-1 bg-black"
      onLayout={(e) => setScreenDimensions(e.nativeEvent.layout)}
    >
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={cameraFacing}
        flash={flashEnabled ? 'on' : 'off'}
        onCameraReady={onCameraReady}
      >
        {/* Header */}
        <SafeAreaView className="absolute top-0 left-0 right-0 flex-row justify-between items-center p-4 z-10">
          <Button
            title=""
            icon={<Ionicons name="close" size={24} color="white" />}
            onPress={handleClose}
            variant="secondary"
            size="sm"
          />
          <View className="flex-row items-center">
            {captureFor === 'answer-key' && (
              <View className="bg-blue-600/80 px-3 py-1 rounded-full mr-2">
                <Text className="text-white text-sm font-medium">Answer Key</Text>
              </View>
            )}
            {!sensorAvailable && (
              <View className="bg-orange-600/80 px-3 py-1 rounded-full">
                <Text className="text-white text-xs">Modo Manual</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        {/* Detection overlay with guide lines - ALWAYS SHOW */}
        <CameraOverlay
          corners={corners}
          confidence={confidence}
          frameWidth={screenDimensions.width}
          frameHeight={screenDimensions.height}
        />

        {/* Processing overlay */}
        {isProcessingImage && (
          <View className="absolute inset-0 bg-black/70 items-center justify-center z-50">
            <LoadingSpinner message="Procesando y recortando..." />
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
