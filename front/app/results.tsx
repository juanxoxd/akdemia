import React, { useEffect } from 'react';
import { View, Text, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScoreDisplay } from '../src/presentation/components/results/ScoreDisplay';
import { StatsGrid } from '../src/presentation/components/results/StatsGrid';
import { AnswersList } from '../src/presentation/components/results/AnswersList';
import { Button } from '../src/presentation/components/common/Button';
import { LoadingSpinner } from '../src/presentation/components/common/LoadingSpinner';
import { ErrorMessage } from '../src/presentation/components/common/ErrorMessage';
import { Card } from '../src/presentation/components/common/Card';
import { useProcessing } from '../src/presentation/hooks/useProcessing';
import { useExamStore, useCaptureStore, useProcessingStore } from '../src/store';

export default function ResultsScreen() {
  const router = useRouter();
  const { selectedExam, resetExamState } = useExamStore();
  const { resetCaptureState } = useCaptureStore();
  const { resetProcessingState } = useProcessingStore();
  
  const {
    examAttempt,
    isPolling,
    pollingAttempts,
    processingError,
    startPolling,
    stopPolling,
  } = useProcessing();

  // Start polling on mount if not already
  useEffect(() => {
    if (!examAttempt && !isPolling) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, []);

  const handleScanAnother = () => {
    resetCaptureState();
    resetProcessingState();
    router.replace('/capture');
  };

  const handleGoHome = () => {
    resetExamState();
    resetCaptureState();
    resetProcessingState();
    router.replace('/');
  };

  const handleViewImage = () => {
    if (examAttempt?.imageUrl) {
      // Open image in modal or browser
      Alert.alert('Imagen', 'Abrir imagen en navegador', [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Abrir', 
          onPress: () => {
            // In production, use Linking.openURL or show in modal
            console.log('Open image:', examAttempt.imageUrl);
          }
        },
      ]);
    }
  };

  // Loading state
  if (isPolling && (!examAttempt || examAttempt.status === 'PENDING' || examAttempt.status === 'PROCESSING')) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center p-6">
        <View className="items-center">
          <LoadingSpinner size="large" />
          <Text className="text-gray-900 font-semibold text-lg mt-6">
            Procesando tu hoja de respuestas
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Esto puede tomar unos segundos...
          </Text>
          <Text className="text-gray-400 text-sm mt-4">
            Intento {pollingAttempts} de 30
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (processingError || examAttempt?.status === 'FAILED') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 p-6">
        <ErrorMessage
          title="Error en el procesamiento"
          message={processingError || 'No se pudo procesar la hoja de respuestas'}
          onRetry={() => {
            router.replace('/capture');
          }}
          retryLabel="Escanear de nuevo"
        />
        <View className="mt-4">
          <Button
            title="Volver al inicio"
            onPress={handleGoHome}
            variant="outline"
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  // Pending review state
  if (examAttempt?.status === 'PENDING_REVIEW') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 p-6">
        <View className="items-center py-8">
          <Ionicons name="warning" size={64} color="#f59e0b" />
          <Text className="text-gray-900 font-bold text-xl mt-4">
            Revisión Pendiente
          </Text>
          <Text className="text-gray-600 text-center mt-2 px-4">
            El escaneo tiene baja confianza ({((examAttempt.confidenceScore || 0) * 100).toFixed(1)}%).
            Tu hoja será revisada manualmente.
          </Text>
        </View>

        {examAttempt.score !== undefined && (
          <Card className="mt-4">
            <Text className="text-gray-700 font-medium">Resultado preliminar:</Text>
            <Text className="text-2xl font-bold text-gray-900 mt-2">
              {examAttempt.score} / {examAttempt.totalQuestions}
            </Text>
          </Card>
        )}

        <View className="mt-8 gap-3">
          <Button
            title="Escanear otra hoja"
            onPress={handleScanAnother}
            variant="primary"
            fullWidth
          />
          <Button
            title="Volver al inicio"
            onPress={handleGoHome}
            variant="outline"
            fullWidth
          />
        </View>
      </SafeAreaView>
    );
  }

  // Success state - show results
  if (examAttempt?.status === 'COMPLETED' && examAttempt.score !== undefined) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="bg-primary-800 px-6 py-4">
            <Text className="text-white font-semibold text-lg">
              {selectedExam?.title || 'Examen'}
            </Text>
            <Text className="text-primary-200 text-sm mt-1">
              Procesado: {examAttempt.processedAt 
                ? new Date(examAttempt.processedAt).toLocaleString() 
                : 'Ahora'}
            </Text>
          </View>

          {/* Score display */}
          <ScoreDisplay
            score={examAttempt.totalCorrect || examAttempt.score}
            total={examAttempt.totalQuestions || 0}
            percentage={examAttempt.percentage || 0}
          />

          {/* Stats grid */}
          <StatsGrid
            correct={examAttempt.totalCorrect || 0}
            incorrect={examAttempt.totalIncorrect || 0}
            blank={examAttempt.totalBlank || 0}
            confidence={examAttempt.confidenceScore}
          />

          {/* View original image */}
          {examAttempt.imageUrl && (
            <View className="px-4 mt-6">
              <Card onPress={handleViewImage}>
                <View className="flex-row items-center">
                  <Ionicons name="image-outline" size={24} color="#2563eb" />
                  <Text className="text-primary-600 font-medium ml-2">
                    Ver imagen escaneada
                  </Text>
                </View>
              </Card>
            </View>
          )}

          {/* Answers list */}
          {examAttempt.answers && examAttempt.answers.length > 0 && (
            <AnswersList answers={examAttempt.answers} />
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title="Inicio"
                onPress={handleGoHome}
                variant="outline"
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                title="Escanear otra"
                onPress={handleScanAnother}
                variant="primary"
                fullWidth
                icon={<Ionicons name="scan" size={18} color="white" />}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback
  return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
      <LoadingSpinner message="Cargando resultados..." />
    </SafeAreaView>
  );
}
