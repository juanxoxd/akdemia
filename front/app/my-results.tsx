import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExamStore } from '../src/store/examStore';
import { examApi } from '../src/data/api';

export default function MyResultsScreen() {
  const { currentStudent } = useExamStore();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!currentStudent?.studentCode) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('[MyResults] Searching results for:', currentStudent.studentCode);

      // Use the new endpoint that searches across all exams
      const results = await examApi.searchStudentResultsAcrossExams(currentStudent.studentCode);
      console.log('[MyResults] Found results:', results);

      setAttempts(results);
    } catch (error) {
      console.error('[MyResults] Error loading:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentStudent?.studentCode]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const summary = useMemo(() => {
    if (attempts.length === 0) return { avg: 0, total: 0, passed: 0 };

    const processed = attempts.filter((a) => a.status === 'COMPLETED' || a.status === 'completed');
    const totalScore = processed.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
    // Aprobado si score >= 55 (equivalente a 11/20)
    const passedCount = processed.filter((a) => (parseFloat(a.score) || 0) >= 55).length;

    return {
      avg: processed.length > 0 ? (totalScore / processed.length).toFixed(0) : 0,
      total: attempts.length,
      passed: passedCount,
    };
  }, [attempts]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#f9fafb',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Cargando tus resultados...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e40af']} />
        }
      >
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: '#1e40af',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 }}>
            Resumen General
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>
                {summary.avg}/100
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Promedio</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>
                {summary.total}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Exámenes</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#86efac', fontSize: 32, fontWeight: 'bold' }}>
                {summary.passed}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Aprobados</Text>
            </View>
          </View>
        </View>

        {/* Results List */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
          Historial de Exámenes
        </Text>

        {attempts.map((attempt) => {
          const scoreNum = parseFloat(attempt.score) || 0;
          // El score es sobre 100, calculamos el porcentaje
          const percentage = Math.min(scoreNum, 100);
          // Aprobado si tiene >= 55% (11/20 equivalente)
          const isPassed = scoreNum >= 55;

          return (
            <View
              key={attempt.attemptId}
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                    {attempt.examTitle}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isPassed ? '#dcfce7' : '#fee2e2',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: isPassed ? '#15803d' : '#dc2626',
                    }}
                  >
                    {isPassed ? 'Aprobado' : 'Desaprobado'}
                  </Text>
                </View>
              </View>

              {/* Score Bar */}
              <View style={{ marginBottom: 8 }}>
                <View
                  style={{
                    height: 8,
                    backgroundColor: '#e5e7eb',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: isPassed ? '#22c55e' : '#ef4444',
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>
                  {attempt.processedAt
                    ? new Date(attempt.processedAt).toLocaleTimeString()
                    : 'Procesado'}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: 'bold',
                    color: isPassed ? '#15803d' : '#dc2626',
                  }}
                >
                  Puntaje: {scoreNum.toFixed(1)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Empty State */}
        {attempts.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={{ fontSize: 18, color: '#6b7280', marginTop: 16, fontWeight: '500' }}>
              Sin resultados
            </Text>
            <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
              {currentStudent?.studentCode
                ? `No se encontraron resultados para el código ${currentStudent.studentCode}.`
                : 'Tus resultados aparecerán aquí después de registrar tu código y tomar un examen.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
