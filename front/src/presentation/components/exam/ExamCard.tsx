import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Exam } from '../../../domain/entities';

interface ExamCardProps {
  exam: Exam;
  onPress: () => void;
}

export const ExamCard: React.FC<ExamCardProps> = ({ exam, onPress }) => {
  const isActive = exam.status === 'active';
  
  return (
    <Card onPress={isActive ? onPress : undefined} className="mb-3">
      <View className="flex-row items-center">
        {/* Icon */}
        <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
          isActive ? 'bg-primary-100' : 'bg-gray-100'
        }`}>
          <Ionicons 
            name="document-text" 
            size={24} 
            color={isActive ? '#2563eb' : '#9ca3af'} 
          />
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text className={`font-semibold text-base ${
            isActive ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {exam.title}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-gray-500 text-sm">
              {exam.totalQuestions} preguntas
            </Text>
            <Text className="text-gray-300 mx-2">•</Text>
            <Text className="text-gray-500 text-sm">
              {new Date(exam.date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Status badge */}
        <View className={`px-3 py-1 rounded-full ${
          isActive ? 'bg-success-50' : 'bg-gray-100'
        }`}>
          <Text className={`text-xs font-medium ${
            isActive ? 'text-success-600' : 'text-gray-500'
          }`}>
            {isActive ? 'Activo' : 'Cerrado'}
          </Text>
        </View>
      </View>
    </Card>
  );
};
