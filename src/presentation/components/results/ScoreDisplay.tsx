import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ScoreDisplayProps {
  score: number;
  total: number;
  percentage: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  total,
  percentage,
}) => {
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (percentage / 100) * circumference;

  const getScoreColor = () => {
    if (percentage >= 80) return '#22c55e'; // Green
    if (percentage >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const color = getScoreColor();

  return (
    <View className="items-center py-6">
      {/* Circular progress */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Score text in center */}
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-4xl font-bold" style={{ color }}>
            {score}/{total}
          </Text>
          <Text className="text-gray-500 text-base mt-1">
            {percentage.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Score label */}
      <Text className="text-xl font-semibold text-gray-900 mt-4">
        {percentage >= 80 ? '¡Excelente!' : percentage >= 60 ? 'Buen trabajo' : 'Sigue practicando'}
      </Text>
    </View>
  );
};
