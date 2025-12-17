import React from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StudentForm } from '../../src/presentation/components/exam/StudentForm';
import { Card } from '../../src/presentation/components/common/Card';
import { useRegisterStudent } from '../../src/presentation/hooks/useExams';
import { useExamStore } from '../../src/store';

export default function StudentRegistrationScreen() {
  const router = useRouter();
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { selectedExam, setRegisteredStudent } = useExamStore();
  const { registerStudent, isRegistering, registrationError, isSuccess } = useRegisterStudent();

  React.useEffect(() => {
    if (isSuccess) {
      // Navigate to camera after successful registration
      router.push('/capture');
    }
  }, [isSuccess, router]);

  const handleSubmit = (data: { studentCode: string; fullName: string; email: string }) => {
    if (!selectedExam) {
      Alert.alert('Error', 'No hay examen seleccionado');
      return;
    }

    registerStudent(data, {
      onSuccess: (response) => {
        setRegisteredStudent({
          studentId: response.studentId,
          examId: response.examId,
          ...data,
        });
      },
      onError: (error) => {
        Alert.alert('Error', (error as Error).message);
      },
    });
  };

  if (!selectedExam) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text className="text-gray-900 font-semibold text-lg mt-4">
          No hay examen seleccionado
        </Text>
        <Text 
          className="text-primary-600 mt-4 underline"
          onPress={() => router.back()}
        >
          Volver a exámenes
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      {/* Exam info header */}
      <View className="px-6 pt-4 pb-2">
        <Card>
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-primary-100 items-center justify-center mr-4">
              <Ionicons name="document-text" size={24} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900 text-base">
                {selectedExam.title}
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                {selectedExam.totalQuestions} preguntas
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Student form */}
      <View className="flex-1 pt-4">
        <StudentForm
          onSubmit={handleSubmit}
          isLoading={isRegistering}
          error={registrationError?.message}
        />
      </View>
    </SafeAreaView>
  );
}
