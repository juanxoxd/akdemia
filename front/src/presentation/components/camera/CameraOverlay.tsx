import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Polygon, Circle, Line, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { DetectedCorners } from '../../../domain/entities';

interface CameraOverlayProps {
  corners: DetectedCorners | null;
  confidence: number;
  frameWidth: number;
  frameHeight: number;
}

// Animated SVG components
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  corners,
  confidence,
  frameWidth,
  frameHeight,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when confidence is high
  useEffect(() => {
    if (confidence >= 0.9) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [confidence, pulseAnim]);

  // Fade in overlay
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getOverlayColor = () => {
    if (confidence >= 0.9) return '#22c55e'; // Green for high confidence
    if (confidence >= 0.7) return '#f59e0b'; // Yellow/Orange for medium-high
    if (confidence >= 0.5) return '#fb923c'; // Orange for medium
    return '#ef4444'; // Red for low
  };

  const getStatusMessage = () => {
    if (confidence >= 0.9) return { text: '¡Perfecto! Capturando...', icon: 'checkmark-circle' as const };
    if (confidence >= 0.7) return { text: 'Casi listo, mantén estable', icon: 'time' as const };
    if (confidence >= 0.5) return { text: 'Ajusta el encuadre', icon: 'scan' as const };
    return { text: 'Busca la hoja OMR', icon: 'search' as const };
  };

  const color = getOverlayColor();
  const status = getStatusMessage();

  // A4 guide dimensions (ratio 1:1.414)
  const guideWidth = frameWidth * 0.85;
  const guideHeight = guideWidth * 1.414;
  const guideX = (frameWidth - guideWidth) / 2;
  const guideY = (frameHeight - guideHeight) / 2;

  // Corner bracket size
  const bracketSize = 40;
  const bracketThickness = 4;

  if (!corners) {
    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: fadeAnim,
        }}
      >
        {/* A4 Guide Frame */}
        <Svg width={frameWidth} height={frameHeight}>
          {/* Semi-transparent corners */}
          {/* Top-left corner bracket */}
          <Line x1={guideX} y1={guideY} x2={guideX + bracketSize} y2={guideY}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />
          <Line x1={guideX} y1={guideY} x2={guideX} y2={guideY + bracketSize}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />

          {/* Top-right corner bracket */}
          <Line x1={guideX + guideWidth - bracketSize} y1={guideY} x2={guideX + guideWidth} y2={guideY}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />
          <Line x1={guideX + guideWidth} y1={guideY} x2={guideX + guideWidth} y2={guideY + bracketSize}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />

          {/* Bottom-left corner bracket */}
          <Line x1={guideX} y1={guideY + guideHeight - bracketSize} x2={guideX} y2={guideY + guideHeight}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />
          <Line x1={guideX} y1={guideY + guideHeight} x2={guideX + bracketSize} y2={guideY + guideHeight}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />

          {/* Bottom-right corner bracket */}
          <Line x1={guideX + guideWidth - bracketSize} y1={guideY + guideHeight} x2={guideX + guideWidth} y2={guideY + guideHeight}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />
          <Line x1={guideX + guideWidth} y1={guideY + guideHeight - bracketSize} x2={guideX + guideWidth} y2={guideY + guideHeight}
            stroke="white" strokeWidth={bracketThickness} strokeLinecap="round" />
        </Svg>

        {/* Center instruction */}
        <View style={{
          position: 'absolute',
          top: guideY + guideHeight / 2 - 60,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            maxWidth: guideWidth * 0.9,
          }}>
            <Ionicons name="scan-outline" size={48} color="white" />
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
              Apunta hacia la hoja OMR
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              Alinea la hoja dentro de los marcadores
            </Text>
          </View>
        </View>

        {/* Tips at bottom */}
        <View style={{
          position: 'absolute',
          bottom: 140,
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
              Asegúrate de tener buena iluminación
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Convert corner coordinates to screen coordinates
  const points = `
    ${corners.topLeft.x},${corners.topLeft.y}
    ${corners.topRight.x},${corners.topRight.y}
    ${corners.bottomRight.x},${corners.bottomRight.y}
    ${corners.bottomLeft.x},${corners.bottomLeft.y}
  `;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width={frameWidth} height={frameHeight}>
        {/* Document outline */}
        <Polygon
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinejoin="round"
        />

        {/* Corner indicators with circles */}
        <Circle cx={corners.topLeft.x} cy={corners.topLeft.y} r={12} fill={color} />
        <Circle cx={corners.topRight.x} cy={corners.topRight.y} r={12} fill={color} />
        <Circle cx={corners.bottomLeft.x} cy={corners.bottomLeft.y} r={12} fill={color} />
        <Circle cx={corners.bottomRight.x} cy={corners.bottomRight.y} r={12} fill={color} />

        {/* Inner circles for visual appeal */}
        <Circle cx={corners.topLeft.x} cy={corners.topLeft.y} r={6} fill="white" />
        <Circle cx={corners.topRight.x} cy={corners.topRight.y} r={6} fill="white" />
        <Circle cx={corners.bottomLeft.x} cy={corners.bottomLeft.y} r={6} fill="white" />
        <Circle cx={corners.bottomRight.x} cy={corners.bottomRight.y} r={6} fill="white" />
      </Svg>

      {/* Status indicator at top */}
      <View style={{
        position: 'absolute',
        top: 80,
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
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15, marginLeft: 8 }}>
            {status.text}
          </Text>
        </Animated.View>
      </View>

      {/* Confidence bar at bottom */}
      <View style={{
        position: 'absolute',
        bottom: 140,
        left: 40,
        right: 40,
      }}>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: 12,
          padding: 12,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: 'white', fontSize: 12 }}>Calidad de detección</Text>
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
    </View>
  );
};

