import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Line, Rect, Defs, Mask } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { DetectedCorners } from '../../../domain/entities';
import { ENV } from '../../../config/env';

interface CameraOverlayProps {
  corners: DetectedCorners | null;
  confidence: number;
  frameWidth: number;
  frameHeight: number;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  corners,
  confidence,
  frameWidth,
  frameHeight,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when confidence is high
  useEffect(() => {
    if (confidence >= 0.9) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow effect
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      pulseAnim.setValue(1);
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [confidence, pulseAnim, glowAnim]);

  // Calculate frame dimensions based on ENV margins (dynamic for all screens)
  const frameX = frameWidth * ENV.FRAME_MARGIN_HORIZONTAL;
  const frameY = frameHeight * ENV.FRAME_MARGIN_TOP;
  const frameCropWidth = frameWidth * (1 - ENV.FRAME_MARGIN_HORIZONTAL * 2);
  const frameCropHeight = frameHeight * (1 - ENV.FRAME_MARGIN_TOP - ENV.FRAME_MARGIN_BOTTOM);

  // Corner bracket size (responsive)
  const bracketSize = Math.min(frameCropWidth, frameCropHeight) * 0.08;
  const bracketThickness = 4;

  // Get color based on confidence
  const getOverlayColor = () => {
    if (confidence >= 0.9) return '#22c55e'; // Green - ready to capture
    if (confidence >= 0.7) return '#f59e0b'; // Yellow - almost ready
    if (confidence >= 0.5) return '#fb923c'; // Orange - adjust position
    return '#ef4444'; // Red - not detected
  };

  // Get status message
  const getStatusMessage = () => {
    if (confidence >= 0.9) return { text: '¡Listo! Mantén estable...', icon: 'checkmark-circle' as const };
    if (confidence >= 0.7) return { text: 'Casi listo, no muevas', icon: 'time' as const };
    if (confidence >= 0.5) return { text: 'Mantén el teléfono plano', icon: 'phone-portrait' as const };
    return { text: 'Coloca el teléfono paralelo a la hoja', icon: 'scan' as const };
  };

  const color = getOverlayColor();
  const status = getStatusMessage();

  // Don't render if dimensions are not ready
  if (frameWidth === 0 || frameHeight === 0) {
    return null;
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Dark overlay outside the frame */}
      <Svg width={frameWidth} height={frameHeight} style={{ position: 'absolute' }}>
        <Defs>
          <Mask id="frameMask">
            <Rect x="0" y="0" width={frameWidth} height={frameHeight} fill="white" />
            <Rect
              x={frameX}
              y={frameY}
              width={frameCropWidth}
              height={frameCropHeight}
              fill="black"
              rx={12}
            />
          </Mask>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={frameWidth}
          height={frameHeight}
          fill="rgba(0,0,0,0.6)"
          mask="url(#frameMask)"
        />
      </Svg>

      {/* Frame border and corners */}
      <Svg width={frameWidth} height={frameHeight} style={{ position: 'absolute' }}>
        {/* Main frame border */}
        <Rect
          x={frameX}
          y={frameY}
          width={frameCropWidth}
          height={frameCropHeight}
          fill="none"
          stroke={color}
          strokeWidth={3}
          rx={12}
          opacity={0.8}
        />

        {/* Corner brackets - Top Left */}
        <Line
          x1={frameX} y1={frameY + bracketSize}
          x2={frameX} y2={frameY}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />
        <Line
          x1={frameX} y1={frameY}
          x2={frameX + bracketSize} y2={frameY}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />

        {/* Corner brackets - Top Right */}
        <Line
          x1={frameX + frameCropWidth - bracketSize} y1={frameY}
          x2={frameX + frameCropWidth} y2={frameY}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />
        <Line
          x1={frameX + frameCropWidth} y1={frameY}
          x2={frameX + frameCropWidth} y2={frameY + bracketSize}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />

        {/* Corner brackets - Bottom Left */}
        <Line
          x1={frameX} y1={frameY + frameCropHeight - bracketSize}
          x2={frameX} y2={frameY + frameCropHeight}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />
        <Line
          x1={frameX} y1={frameY + frameCropHeight}
          x2={frameX + bracketSize} y2={frameY + frameCropHeight}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />

        {/* Corner brackets - Bottom Right */}
        <Line
          x1={frameX + frameCropWidth - bracketSize} y1={frameY + frameCropHeight}
          x2={frameX + frameCropWidth} y2={frameY + frameCropHeight}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />
        <Line
          x1={frameX + frameCropWidth} y1={frameY + frameCropHeight - bracketSize}
          x2={frameX + frameCropWidth} y2={frameY + frameCropHeight}
          stroke={color} strokeWidth={bracketThickness} strokeLinecap="round"
        />

        {/* Corner circles */}
        <Circle cx={frameX} cy={frameY} r={8} fill={color} />
        <Circle cx={frameX + frameCropWidth} cy={frameY} r={8} fill={color} />
        <Circle cx={frameX} cy={frameY + frameCropHeight} r={8} fill={color} />
        <Circle cx={frameX + frameCropWidth} cy={frameY + frameCropHeight} r={8} fill={color} />

        {/* Inner white circles */}
        <Circle cx={frameX} cy={frameY} r={4} fill="white" />
        <Circle cx={frameX + frameCropWidth} cy={frameY} r={4} fill="white" />
        <Circle cx={frameX} cy={frameY + frameCropHeight} r={4} fill="white" />
        <Circle cx={frameX + frameCropWidth} cy={frameY + frameCropHeight} r={4} fill="white" />
      </Svg>

      {/* Status indicator at top */}
      <View style={{
        position: 'absolute',
        top: frameY - 60,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}>
        <Animated.View
          style={{
            transform: [{ scale: confidence >= 0.9 ? pulseAnim : 1 }],
            backgroundColor: color,
            borderRadius: 24,
            paddingHorizontal: 20,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <Ionicons name={status.icon} size={20} color="white" />
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>
            {status.text}
          </Text>
        </Animated.View>
      </View>

      {/* Instructions inside the frame */}
      {confidence < 0.5 && (
        <View style={{
          position: 'absolute',
          top: frameY + frameCropHeight / 2 - 60,
          left: frameX + 20,
          right: frameWidth - frameX - frameCropWidth + 20,
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
          }}>
            <Ionicons name="phone-portrait-outline" size={40} color="white" />
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
              Coloca la hoja OMR dentro del recuadro
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, textAlign: 'center' }}>
              Mantén el teléfono paralelo a la superficie
            </Text>
          </View>
        </View>
      )}

      {/* Confidence bar at bottom */}
      <View style={{
        position: 'absolute',
        bottom: frameHeight - frameY - frameCropHeight - 60,
        left: frameX,
        right: frameWidth - frameX - frameCropWidth,
      }}>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 12,
          padding: 12,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: 'white', fontSize: 12 }}>Estabilidad</Text>
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
              {Math.round(confidence * 100)}%
            </Text>
          </View>
          <View style={{
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%',
              width: `${confidence * 100}%`,
              backgroundColor: color,
              borderRadius: 3,
            }} />
          </View>
        </View>
      </View>

      {/* Tips at bottom */}
      <View style={{
        position: 'absolute',
        bottom: 130,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          <Ionicons name="bulb-outline" size={16} color="#fbbf24" />
          <Text style={{ color: 'white', fontSize: 12, marginLeft: 6 }}>
            {confidence >= 0.7
              ? 'Auto-captura en pocos segundos...'
              : 'Buena iluminación mejora la detección'}
          </Text>
        </View>
      </View>
    </View>
  );
};
