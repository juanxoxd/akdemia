/**
 * Scan Screen
 * 
 * Pantalla de escaneo de fichas ópticas con detección en tiempo real
 * usando react-native-vision-camera + react-native-fast-opencv.
 * 
 * NOTA: Esta pantalla solo funciona en dispositivos móviles nativos.
 * En web, redirige a la pantalla de captura tradicional.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, Alert, StyleSheet, Dimensions, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import { LoadingSpinner } from '../src/presentation/components/common/LoadingSpinner';
import { Button } from '../src/presentation/components/common/Button';
import { useCaptureStore } from '../src/store';
import { ENV } from '../src/config/env';
import { DEFAULT_DETECTOR_CONFIG } from '../src/domain/services/sheetDetector';
import type { CapturedImage } from '../src/domain/entities';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Componentes nativos importados condicionalmente
let Camera: any = null;
let useCameraDevice: any = null;
let useCameraPermission: any = null;
let ScannerOverlay: any = null;
let ScannerControls: any = null;
let useSheetDetection: any = null;

// Solo importar módulos nativos en plataformas móviles
if (Platform.OS !== 'web') {
    try {
        const visionCamera = require('react-native-vision-camera');
        Camera = visionCamera.Camera;
        useCameraDevice = visionCamera.useCameraDevice;
        useCameraPermission = visionCamera.useCameraPermission;

        const scannerComponents = require('../src/presentation/components/scanner');
        ScannerOverlay = scannerComponents.ScannerOverlay;
        ScannerControls = scannerComponents.ScannerControls;

        const hooks = require('../src/presentation/hooks/useSheetDetection');
        useSheetDetection = hooks.useSheetDetection;
    } catch (e) {
        console.warn('Native camera modules not available:', e);
    }
}

// Componente para Web - Redirección
function WebFallback() {
    const router = useRouter();

    useEffect(() => {
        // Redirigir a la pantalla de captura tradicional en web
        router.replace('/capture');
    }, [router]);

    return (
        <SafeAreaView style={styles.fallbackContainer}>
            <LoadingSpinner message="Redirigiendo a captura..." />
        </SafeAreaView>
    );
}

// Componente principal nativo
function NativeScanScreen() {
    const router = useRouter();
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');

    // Estado local
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');

    // Store global
    const { setCapturedImage, setIsProcessingImage } = useCaptureStore();

    // Ref a la cámara para captura
    const cameraRef = React.useRef<typeof Camera>(null);

    // Callback de auto-captura
    const handleAutoCapture = useCallback(async () => {
        if (isCapturing) return;
        await capturePhoto();
    }, [isCapturing]);

    // Hook de detección
    const {
        state,
        corners,
        confidence,
        stableFrames,
        frameProcessor,
        reset,
        detection,
    } = useSheetDetection({
        onAutoCapture: handleAutoCapture,
        isActive: !isCapturing,
        config: {
            fps: ENV.DETECTION_FPS || DEFAULT_DETECTOR_CONFIG.fps,
        },
    });

    // Solicitar permisos al montar
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission, requestPermission]);

    // Capturar foto
    const capturePhoto = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        setIsProcessingImage(true);

        try {
            // Tomar foto
            const photo = await cameraRef.current.takePhoto({
                flash: flashEnabled ? 'on' : 'off',
                enableAutoRedEyeReduction: false,
            });

            // Procesar imagen
            const processed = await ImageManipulator.manipulateAsync(
                `file://${photo.path}`,
                [{ resize: { width: ENV.OUTPUT_WIDTH } }],
                {
                    compress: ENV.JPEG_QUALITY,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true,
                }
            );

            // Calcular tamaño
            const base64Length = processed.base64?.length || 0;
            const sizeInMB = (base64Length * 3) / 4 / 1024 / 1024;

            const capturedImage: CapturedImage = {
                uri: processed.uri,
                base64: processed.base64,
                width: processed.width,
                height: processed.height,
                sizeInMB,
            };

            // Guardar en store y navegar
            setCapturedImage(capturedImage);
            router.push('/preview');

        } catch (error) {
            console.error('Error capturando foto:', error);
            Alert.alert('Error', 'No se pudo capturar la foto. Intenta de nuevo.');
            reset();
        } finally {
            setIsCapturing(false);
            setIsProcessingImage(false);
        }
    }, [flashEnabled, isCapturing, setCapturedImage, setIsProcessingImage, reset, router]);

    // Handlers
    const handleClose = () => router.back();
    const handleToggleFlash = () => setFlashEnabled(!flashEnabled);
    const handleToggleCamera = () => setCameraPosition(cameraPosition === 'back' ? 'front' : 'back');

    // Loading permisos
    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <LoadingSpinner fullScreen message="Solicitando permisos de cámara..." />
            </View>
        );
    }

    // Sin dispositivo de cámara
    if (!device) {
        return (
            <View style={styles.container}>
                <LoadingSpinner fullScreen message="Inicializando cámara..." />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Cámara */}
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={!isCapturing}
                photo={true}
                frameProcessor={frameProcessor}
                pixelFormat="rgb"
                torch={flashEnabled ? 'on' : 'off'}
            />

            {/* Overlay de detección */}
            <ScannerOverlay
                corners={corners}
                state={state}
                confidence={confidence}
                stableFrames={stableFrames}
                stableFramesThreshold={DEFAULT_DETECTOR_CONFIG.stableFramesThreshold}
                frameWidth={SCREEN_WIDTH}
                frameHeight={SCREEN_HEIGHT}
                quality={detection?.quality}
            />

            {/* Controles */}
            <ScannerControls
                state={state}
                flashEnabled={flashEnabled}
                isCapturing={isCapturing}
                onCapture={capturePhoto}
                onToggleFlash={handleToggleFlash}
                onToggleCamera={handleToggleCamera}
                onClose={handleClose}
            />

            {/* Loading overlay durante captura */}
            {isCapturing && (
                <View style={styles.capturingOverlay}>
                    <LoadingSpinner message="Procesando captura..." />
                </View>
            )}
        </View>
    );
}

// Componente exportado - Decide qué renderizar según plataforma
export default function ScanScreen() {
    // En web o si los módulos nativos no están disponibles, usar fallback
    if (Platform.OS === 'web' || !Camera) {
        return <WebFallback />;
    }

    return <NativeScanScreen />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    capturingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fallbackContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
