import React from 'react';
import { View, Text } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  height?: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  height = 8,
  color = 'primary',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const colorStyles = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
  };

  return (
    <View className="w-full">
      <View 
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height }}
      >
        <View
          className={`h-full rounded-full ${colorStyles[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </View>
      {showLabel && (
        <Text className="text-gray-600 text-sm mt-1 text-center">
          {Math.round(clampedProgress)}%
        </Text>
      )}
    </View>
  );
};
