/**
 * ScannerOverlay Component
 * 
 * Muestra el overlay de detección sobre el video de la cámara.
 * Dibuja el cuadrilátero detectado, indicadores de esquinas,
 * y barra de estado/calidad.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line, Rect, Defs, Mask } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { SheetCorners, DetectorState, FrameQuality } from '../../../domain/entities/DetectedSheet';

interface ScannerOverlayProps {
    /** Esquinas detectadas del cuadrilátero */
    corners: SheetCorners | null;
    /** Estado actual del detector */
    state: DetectorState;
    /** Confianza de detección 0-1 */
    confidence: number;
    /** Frames estables acumulados */
    stableFrames: number;
    /** Frames necesarios para auto-captura */
    stableFramesThreshold: number;
    /** Dimensiones del frame */
    frameWidth: number;
    frameHeight: number;
    /** Calidad del frame (opcional) */
    quality?: FrameQuality;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
    corners,
    state,
    confidence,
    stableFrames,
    stableFramesThreshold,
    frameWidth,
    frameHeight,
    quality,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Animación de pulso cuando está estable
    useEffect(() => {
        if (state === 'stable' || state === 'captured') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 300,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 300,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [state, pulseAnim]);

    // Colores según estado
    const getColor = () => {
        switch (state) {
            case 'captured':
                return '#22c55e'; // Verde
            case 'stable':
                return '#22c55e'; // Verde
            case 'detecting':
                return '#f59e0b'; // Amarillo
            default:
                return '#ef4444'; // Rojo
        }
    };

    // Mensaje según estado
    const getMessage = () => {
        switch (state) {
            case 'captured':
                return { text: '¡Capturado!', icon: 'checkmark-circle' as const };
            case 'stable':
                return { text: 'Mantén estable...', icon: 'scan' as const };
            case 'detecting':
                return { text: 'Ficha detectada', icon: 'document' as const };
            default:
                return { text: 'Busca la ficha óptica', icon: 'search' as const };
        }
    };

    const color = getColor();
    const message = getMessage();
    const stableProgress = Math.min(stableFrames / stableFramesThreshold, 1);

    // No renderizar si no hay dimensiones
    if (frameWidth === 0 || frameHeight === 0) {
        return null;
    }

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Overlay SVG para cuadrilátero detectado */}
            {corners && (
                <Svg width={frameWidth} height={frameHeight} style={styles.svg}>
                    {/* Polígono del cuadrilátero */}
                    <Polygon
                        points={`${corners.topLeft.x},${corners.topLeft.y} ${corners.topRight.x},${corners.topRight.y} ${corners.bottomRight.x},${corners.bottomRight.y} ${corners.bottomLeft.x},${corners.bottomLeft.y}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={4}
                        strokeLinejoin="round"
                    />

                    {/* Círculos en las esquinas */}
                    <Circle cx={corners.topLeft.x} cy={corners.topLeft.y} r={12} fill={color} />
                    <Circle cx={corners.topRight.x} cy={corners.topRight.y} r={12} fill={color} />
                    <Circle cx={corners.bottomRight.x} cy={corners.bottomRight.y} r={12} fill={color} />
                    <Circle cx={corners.bottomLeft.x} cy={corners.bottomLeft.y} r={12} fill={color} />

                    {/* Círculos internos blancos */}
                    <Circle cx={corners.topLeft.x} cy={corners.topLeft.y} r={6} fill="white" />
                    <Circle cx={corners.topRight.x} cy={corners.topRight.y} r={6} fill="white" />
                    <Circle cx={corners.bottomRight.x} cy={corners.bottomRight.y} r={6} fill="white" />
                    <Circle cx={corners.bottomLeft.x} cy={corners.bottomLeft.y} r={6} fill="white" />
                </Svg>
            )}

            {/* Status badge en la parte superior */}
            <View style={styles.statusContainer}>
                <Animated.View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: color, transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    <Ionicons name={message.icon} size={20} color="white" />
                    <Text style={styles.statusText}>{message.text}</Text>
                </Animated.View>
            </View>

            {/* Barra de progreso de estabilidad */}
            {state === 'detecting' || state === 'stable' ? (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${stableProgress * 100}%`, backgroundColor: color },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        Estabilidad: {Math.round(stableProgress * 100)}%
                    </Text>
                </View>
            ) : null}

            {/* Indicador de calidad (blur/brillo) */}
            {quality && (
                <View style={styles.qualityContainer}>
                    <View style={styles.qualityBadge}>
                        <Ionicons
                            name={quality.blur > 100 ? 'eye' : 'eye-off'}
                            size={14}
                            color={quality.blur > 100 ? '#22c55e' : '#ef4444'}
                        />
                        <Text style={styles.qualityText}>
                            {quality.blur > 100 ? 'Nítido' : 'Borroso'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Instrucciones cuando no detecta */}
            {state === 'idle' && (
                <View style={styles.instructionsContainer}>
                    <View style={styles.instructionsBox}>
                        <Ionicons name="scan-outline" size={40} color="white" />
                        <Text style={styles.instructionsTitle}>Coloca la ficha óptica</Text>
                        <Text style={styles.instructionsSubtitle}>
                            Encuadra la hoja dentro del área de cámara
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    svg: {
        position: 'absolute',
    },
    statusContainer: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    statusText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    progressContainer: {
        position: 'absolute',
        bottom: 200,
        left: 40,
        right: 40,
        alignItems: 'center',
    },
    progressBackground: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        color: 'white',
        fontSize: 12,
        marginTop: 8,
    },
    qualityContainer: {
        position: 'absolute',
        top: 160,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    qualityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    qualityText: {
        color: 'white',
        fontSize: 12,
        marginLeft: 6,
    },
    instructionsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionsBox: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        marginHorizontal: 40,
    },
    instructionsTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
    },
    instructionsSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
});
