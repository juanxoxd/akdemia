import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatsGridProps {
  correct: number;
  incorrect: number;
  blank: number;
  confidence?: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  correct,
  incorrect,
  blank,
  confidence,
}) => {
  const stats = [
    {
      label: 'Correctas',
      value: correct,
      icon: 'checkmark-circle',
      color: '#22c55e',
      bgColor: 'bg-success-50',
    },
    {
      label: 'Incorrectas',
      value: incorrect,
      icon: 'close-circle',
      color: '#ef4444',
      bgColor: 'bg-error-50',
    },
    {
      label: 'En blanco',
      value: blank,
      icon: 'remove-circle',
      color: '#9ca3af',
      bgColor: 'bg-gray-100',
    },
  ];

  return (
    <View className="px-4">
      <View className="flex-row justify-between mb-4">
        {stats.map((stat) => (
          <View
            key={stat.label}
            className={`flex-1 mx-1 p-4 rounded-2xl items-center ${stat.bgColor}`}
          >
            <Ionicons name={stat.icon as any} size={28} color={stat.color} />
            <Text className="text-2xl font-bold mt-2" style={{ color: stat.color }}>
              {stat.value}
            </Text>
            <Text className="text-gray-600 text-xs mt-1">{stat.label}</Text>
          </View>
        ))}
      </View>

      {confidence !== undefined && (
        <View className="bg-primary-50 p-4 rounded-2xl flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="analytics" size={24} color="#2563eb" />
            <Text className="text-primary-700 font-medium ml-2">
              Confianza del escaneo
            </Text>
          </View>
          <Text className="text-primary-600 font-bold">
            {(confidence * 100).toFixed(1)}%
          </Text>
        </View>
      )}
    </View>
  );
};
