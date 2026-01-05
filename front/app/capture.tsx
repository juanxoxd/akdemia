import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DeviceMotion } from 'expo-sensors';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
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
    setCameraPermission,
  } = useCamera();

  const { captureMode, isProcessingImage, setCaptureMode, resetCaptureState } = useCaptureStore();

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
    if (Platform.OS === 'web') {
      setSensorAvailable(false);
      setConfidence(0.5);
      return;
    }

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
    if (Platform.OS === 'web') return; // Never start sensors on web
    if (cameraPermission !== 'granted' || showConfirmation) return;
    if (!sensorAvailable) return;
    if (captureMode !== 'auto') {
      setConfidence(0.6); // Medium confidence for manual mode
      return;
    }

    console.log('Starting DeviceMotion sensor...');
    try {
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
    } catch (error) {
      console.log('Error adding DeviceMotion listener:', error);
      setSensorAvailable(false);
    }
  }, [cameraPermission, captureMode, sensorAvailable, showConfirmation]);

  // Update confidence for manual mode or when sensors unavailable
  useEffect(() => {
    if (captureMode === 'manual' || !sensorAvailable || Platform.OS === 'web') {
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
        y: screenDimensions.height * ENV.FRAME_MARGIN_TOP,
      },
      topRight: {
        x: screenDimensions.width * (1 - ENV.FRAME_MARGIN_HORIZONTAL),
        y: screenDimensions.height * ENV.FRAME_MARGIN_TOP,
      },
      bottomLeft: {
        x: screenDimensions.width * ENV.FRAME_MARGIN_HORIZONTAL,
        y: screenDimensions.height * (1 - ENV.FRAME_MARGIN_BOTTOM),
      },
      bottomRight: {
        x: screenDimensions.width * (1 - ENV.FRAME_MARGIN_HORIZONTAL),
        y: screenDimensions.height * (1 - ENV.FRAME_MARGIN_BOTTOM),
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
        params: { mode: 'answer-key', examId },
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

  // Pick image from gallery
  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para seleccionar la imagen'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const asset = result.assets[0];

        // Process the image to match expected format
        const processed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: ENV.OUTPUT_WIDTH } }],
          {
            compress: ENV.JPEG_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

        const base64Length = processed.base64?.length || 0;
        const sizeInMB = (base64Length * 3) / 4 / 1024 / 1024;

        const capturedImg: CapturedImage = {
          uri: processed.uri,
          base64: processed.base64,
          width: processed.width,
          height: processed.height,
          sizeInMB,
        };

        // Store and show preview
        setPreviewImage(capturedImg);
        setShowConfirmation(true);

        // Also set in global store
        const { setCapturedImage } = useCaptureStore.getState();
        setCapturedImage(capturedImg);
      } catch (error) {
        console.error('Error processing gallery image:', error);
        Alert.alert('Error', 'No se pudo procesar la imagen');
      }
    }
  };

  // Render camera permission or web specific view
  if (cameraPermission === 'undetermined' && Platform.OS !== 'web') {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Modern UI for Web or when permission is denied
  if (!showConfirmation && (cameraPermission === 'denied' || Platform.OS === 'web')) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 px-6 justify-center">
          <View className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Subir Hoja de Respuestas</Text>
            <Text className="text-gray-500 mb-8">
              Elige cómo prefieres cargar la imagen del examen
            </Text>

            <View className="space-y-4">
              {/* Tomar Foto Button */}
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web') {
                    // Force camera view on web
                    setCameraPermission('granted' as any);
                  } else {
                    handleOpenSettings();
                  }
                }}
                className="bg-blue-50/50 p-6 rounded-2xl flex-row items-center border border-blue-100"
              >
                <View className="w-14 h-14 bg-primary-600 rounded-full items-center justify-center mr-4">
                  <Ionicons name="camera" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-primary-800">Tomar Foto</Text>
                  <Text className="text-primary-600/70">Usa la cámara para capturar</Text>
                </View>
              </TouchableOpacity>

              {/* Galería Button */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                className="bg-gray-50 p-6 rounded-2xl flex-row items-center border border-gray-100"
              >
                <View className="w-14 h-14 bg-gray-500 rounded-full items-center justify-center mr-4">
                  <Ionicons name="images" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-800">Seleccionar de Galería</Text>
                  <Text className="text-gray-500">Elige una imagen existente</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View className="mt-8">
              <Button title="Volver" variant="outline" onPress={() => router.back()} fullWidth />
            </View>
          </View>
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
            <Image source={{ uri: previewImage.uri }} style={{ flex: 1 }} resizeMode="contain" />
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
    <View className="flex-1 bg-black" onLayout={(e) => setScreenDimensions(e.nativeEvent.layout)}>
      <CameraView
        ref={cameraRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        facing={cameraFacing}
        flash={flashEnabled ? 'on' : 'off'}
        onCameraReady={onCameraReady}
      />

      {/* Overlay container - FUERA del CameraView */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'box-none',
        }}
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

        {/* Gallery button */}
        <TouchableOpacity
          onPress={handlePickFromGallery}
          style={{
            position: 'absolute',
            bottom: 140,
            right: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 30,
            width: 60,
            height: 60,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="images" size={28} color="white" />
          <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>Galería</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
