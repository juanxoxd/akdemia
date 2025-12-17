import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Circle } from 'react-native-svg';
import { DetectedCorners } from '../../../domain/entities';

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
  const getOverlayColor = () => {
    if (confidence >= 0.9) return '#22c55e'; // Green for high confidence
    if (confidence >= 0.5) return '#f59e0b'; // Yellow/Orange for medium
    return '#ef4444'; // Red for low
  };

  const color = getOverlayColor();

  if (!corners) {
    return (
      <View className="absolute inset-0 items-center justify-center">
        <View className="border-2 border-dashed border-white/50 rounded-lg" 
          style={{ width: frameWidth * 0.8, height: frameHeight * 0.6 }}>
          <View className="flex-1 items-center justify-center">
            <Text className="text-white text-center px-4">
              Apunte la cámara hacia la hoja de respuestas
            </Text>
          </View>
        </View>
      </View>
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
    <View className="absolute inset-0">
      <Svg width={frameWidth} height={frameHeight}>
        {/* Document outline */}
        <Polygon
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        
        {/* Corner indicators */}
        <Circle cx={corners.topLeft.x} cy={corners.topLeft.y} r={8} fill={color} />
        <Circle cx={corners.topRight.x} cy={corners.topRight.y} r={8} fill={color} />
        <Circle cx={corners.bottomLeft.x} cy={corners.bottomLeft.y} r={8} fill={color} />
        <Circle cx={corners.bottomRight.x} cy={corners.bottomRight.y} r={8} fill={color} />
      </Svg>

      {/* Confidence indicator */}
      <View className="absolute top-4 left-1/2 -translate-x-1/2">
        <View 
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: color }}
        >
          <Text className="text-white font-bold text-base">
            {Math.round(confidence * 100)}% Confianza
          </Text>
        </View>
      </View>
    </View>
  );
};
