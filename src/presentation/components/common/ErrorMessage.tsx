import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Reintentar',
}) => {
  return (
    <View className="items-center justify-center p-6 bg-error-50 rounded-2xl">
      <Ionicons name="alert-circle" size={48} color="#ef4444" />
      <Text className="text-error-600 font-bold text-lg mt-4">{title}</Text>
      <Text className="text-gray-600 text-center mt-2">{message}</Text>
      {onRetry && (
        <View className="mt-4">
          <Button
            title={retryLabel}
            onPress={onRetry}
            variant="outline"
            size="sm"
          />
        </View>
      )}
    </View>
  );
};
