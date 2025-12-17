import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Answer } from '../../../domain/entities';

interface AnswersListProps {
  answers: Answer[];
}

const OptionLetters = ['A', 'B', 'C', 'D', 'E'];

export const AnswersList: React.FC<AnswersListProps> = ({ answers }) => {
  const renderAnswer = ({ item }: { item: Answer }) => {
    const getStatusStyle = () => {
      switch (item.status) {
        case 'correct':
          return {
            bgColor: 'bg-success-50',
            borderColor: 'border-success-200',
            iconColor: '#22c55e',
            icon: 'checkmark-circle',
          };
        case 'incorrect':
          return {
            bgColor: 'bg-error-50',
            borderColor: 'border-error-200',
            iconColor: '#ef4444',
            icon: 'close-circle',
          };
        default:
          return {
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            iconColor: '#9ca3af',
            icon: 'remove-circle',
          };
      }
    };

    const style = getStatusStyle();
    const selectedLetter = item.selectedOption !== null 
      ? OptionLetters[item.selectedOption] 
      : '-';
    const correctLetter = OptionLetters[item.correctOption];

    return (
      <View className={`flex-row items-center p-3 mb-2 rounded-xl border ${style.bgColor} ${style.borderColor}`}>
        {/* Question number */}
        <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3">
          <Text className="font-bold text-gray-700">{item.questionNumber}</Text>
        </View>

        {/* Answer info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-gray-600">Tu respuesta: </Text>
            <Text className={`font-bold ${
              item.status === 'correct' ? 'text-success-600' : 
              item.status === 'incorrect' ? 'text-error-600' : 'text-gray-500'
            }`}>
              {selectedLetter}
            </Text>
            
            {item.status === 'incorrect' && (
              <>
                <Text className="text-gray-400 mx-2">→</Text>
                <Text className="text-success-600 font-bold">{correctLetter}</Text>
              </>
            )}
          </View>
          
          {item.confidenceScore < 0.85 && (
            <Text className="text-warning-600 text-xs mt-1">
              ⚠ Confianza baja ({(item.confidenceScore * 100).toFixed(0)}%)
            </Text>
          )}
        </View>

        {/* Status icon */}
        <Ionicons name={style.icon as any} size={24} color={style.iconColor} />
      </View>
    );
  };

  return (
    <View className="px-4 mt-4">
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        Detalle de Respuestas
      </Text>
      <FlatList
        data={answers}
        renderItem={renderAnswer}
        keyExtractor={(item) => item.questionNumber.toString()}
        scrollEnabled={false}
      />
    </View>
  );
};
