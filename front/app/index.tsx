import React from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ExamCard } from '../src/presentation/components/exam/ExamCard';
import { LoadingSpinner, ErrorMessage } from '../src/presentation/components/common';
import { useExams } from '../src/presentation/hooks/useExams';
import { useExamStore } from '../src/store';
import { Exam } from '../src/domain/entities';

export default function ExamsListScreen() {
  const router = useRouter();
  const { exams, isLoading, error, refetch } = useExams();
  const { selectExam } = useExamStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleExamPress = (exam: Exam) => {
    selectExam(exam);
    router.push(`/exam/${exam.examId}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner fullScreen message="Cargando exámenes..." />;
  }

  if (error && !isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 p-6">
        <ErrorMessage
          title="Error al cargar exámenes"
          message={(error as Error).message}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  const activeExams = exams.filter(e => e.status === 'active');
  const closedExams = exams.filter(e => e.status === 'closed');

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <FlatList
        data={exams}
        keyExtractor={(item) => item.examId}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
        ListHeaderComponent={() => (
          <View className="mb-4">
            <View className="flex-row items-center mb-4">
              <Ionicons name="document-text-outline" size={28} color="#1e40af" />
              <Text className="text-xl font-bold text-gray-900 ml-2">
                Exámenes Disponibles
              </Text>
            </View>
            {activeExams.length > 0 && (
              <Text className="text-gray-600 mb-2">
                {activeExams.length} examen(es) activo(s)
              </Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <ExamCard exam={item} onPress={() => handleExamPress(item)} />
        )}
        ListEmptyComponent={() => (
          <View className="items-center py-12">
            <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-lg mt-4">
              No hay exámenes disponibles
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              Los exámenes aparecerán aquí cuando estén disponibles
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
