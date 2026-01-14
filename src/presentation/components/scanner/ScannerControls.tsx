/**
 * ScannerControls Component
 * 
 * Controles de la pantalla de escaneo:
 * - Botón de captura manual
 * - Toggle de flash
 * - Switch de cámara
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DetectorState } from '../../../domain/entities/DetectedSheet';

interface ScannerControlsProps {
    /** Estado actual del detector */
    state: DetectorState;
    /** Si el flash está habilitado */
    flashEnabled: boolean;
    /** Si está procesando captura */
    isCapturing: boolean;
    /** Callback al presionar captura */
    onCapture: () => void;
    /** Callback al toggle flash */
    onToggleFlash: () => void;
    /** Callback al cambiar cámara */
    onToggleCamera: () => void;
    /** Callback para cerrar */
    onClose: () => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({
    state,
    flashEnabled,
    isCapturing,
    onCapture,
    onToggleFlash,
    onToggleCamera,
    onClose,
}) => {
    const isReady = state === 'stable' || state === 'detecting';
    const isCaptured = state === 'captured';

    return (
        <>
            {/* Header con botones superiores */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={onClose}
                >
                    <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.headerButton, flashEnabled && styles.activeButton]}
                        onPress={onToggleFlash}
                    >
                        <Ionicons
                            name={flashEnabled ? 'flash' : 'flash-off'}
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={onToggleCamera}
                    >
                        <Ionicons name="camera-reverse" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Controles inferiores */}
            <View style={styles.footer}>
                {/* Botón de captura principal */}
                <TouchableOpacity
                    style={[
                        styles.captureButton,
                        isReady && styles.captureButtonReady,
                        isCaptured && styles.captureButtonCaptured,
                        isCapturing && styles.captureButtonDisabled,
                    ]}
                    onPress={onCapture}
                    disabled={isCapturing || isCaptured}
                    activeOpacity={0.7}
                >
                    <View style={styles.captureButtonInner}>
                        {isCapturing ? (
                            <Ionicons name="hourglass" size={32} color="white" />
                        ) : isCaptured ? (
                            <Ionicons name="checkmark" size={32} color="white" />
                        ) : (
                            <View style={styles.captureButtonCenter} />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Texto de ayuda */}
                <Text style={styles.helperText}>
                    {isCaptured
                        ? '¡Foto capturada!'
                        : isReady
                            ? 'Toca para capturar o espera auto-captura'
                            : 'Encuadra la ficha óptica'
                    }
                </Text>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    header: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'white',
    },
    captureButtonReady: {
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
    },
    captureButtonCaptured: {
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
    },
    captureButtonDisabled: {
        opacity: 0.5,
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonCenter: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'white',
    },
    helperText: {
        color: 'white',
        fontSize: 14,
        marginTop: 16,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
