import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  className = '',
}) => {
  const baseStyles = 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100';

  if (onPress) {
    return (
      <TouchableOpacity
        className={`${baseStyles} ${className}`}
        style={style}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={`${baseStyles} ${className}`} style={style}>
      {children}
    </View>
  );
};
