import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useExams } from '../../src/presentation/hooks/useExams';
import { examApi } from '../../src/data/api';

export default function StatsScreen() {
  const { exams, isLoading: isLoadingExams } = useExams();
  const [aggregatedStats, setAggregatedStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalStudents: 0,
    processedSheets: 0,
    averageScore: 0,
    passRate: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchAllStats = async () => {
      if (isLoadingExams || exams.length === 0) {
        if (!isLoadingExams) setIsLoadingStats(false);
        return;
      }

      try {
        const activeExams = exams.filter((e) => e.status === 'active');
        const statsPromises = activeExams.map((exam) => examApi.getStatistics(exam.examId));
        const allStats = await Promise.all(statsPromises);

        let totalStudents = 0;
        let processedSheets = 0;
        let sumAverages = 0;
        let activeWithData = 0;

        allStats.forEach((stat) => {
          totalStudents += stat.totalStudents || 0;
          processedSheets += stat.processedStudents || 0;
          if (stat.averageScore !== undefined) {
            sumAverages += stat.averageScore;
            activeWithData++;
          }
        });

        const globalAverage = activeWithData > 0 ? (sumAverages / activeWithData).toFixed(1) : 0;
        const globalPassRate =
          totalStudents > 0 ? ((processedSheets / totalStudents) * 100).toFixed(1) : 0;

        setAggregatedStats({
          totalExams: exams.length,
          activeExams: activeExams.length,
          totalStudents: totalStudents,
          processedSheets: processedSheets,
          averageScore: Number(globalAverage),
          passRate: Number(globalPassRate),
        });
      } catch (error) {
        console.error('[Stats] Error aggregation:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchAllStats();
  }, [exams, isLoadingExams]);

  const stats = aggregatedStats;

  const StatCard = ({
    icon,
    label,
    value,
    color,
    bgColor,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
    color: string;
    bgColor: string;
  }) => (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        flex: 1,
        marginHorizontal: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>{value}</Text>
      <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{label}</Text>
    </View>
  );

  if (isLoadingExams || isLoadingStats) {
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
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Calculando datos reales...</Text>
      </SafeAreaView>
    );
  }

  const { totalExams, activeExams, totalStudents, processedSheets, averageScore, passRate } = stats;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="bar-chart" size={28} color="#1e40af" />
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 8 }}>
            Panel de Estadísticas
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={{ marginHorizontal: -6 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <StatCard
              icon="document-text"
              label="Total Exámenes"
              value={totalExams}
              color="#1e40af"
              bgColor="#eff6ff"
            />
            <StatCard
              icon="checkmark-circle"
              label="Exámenes Activos"
              value={activeExams}
              color="#15803d"
              bgColor="#dcfce7"
            />
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <StatCard
              icon="people"
              label="Total Estudiantes"
              value={totalStudents}
              color="#7c3aed"
              bgColor="#ede9fe"
            />
            <StatCard
              icon="scan"
              label="Hojas Procesadas"
              value={processedSheets}
              color="#0891b2"
              bgColor="#cffafe"
            />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <StatCard
              icon="trending-up"
              label="Promedio General"
              value={`${averageScore}%`}
              color="#ea580c"
              bgColor="#ffedd5"
            />
            <StatCard
              icon="trophy"
              label="Tasa de Aprobación"
              value={`${passRate}%`}
              color="#16a34a"
              bgColor="#dcfce7"
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 16,
            marginTop: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
            Actividad de Exámenes
          </Text>
          {exams.length === 0 ? (
            <Text style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 20 }}>
              No hay exámenes registrados
            </Text>
          ) : (
            exams.slice(0, 5).map((exam, index) => (
              <View
                key={exam.examId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: index < Math.min(exams.length, 5) - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6',
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: exam.status === 'active' ? '#16a34a' : '#1e40af',
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: '#374151' }}>
                    {exam.status === 'draft' ? 'Examen en borrador' : 'Examen publicado'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{exam.title}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                  {new Date(exam.date).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
