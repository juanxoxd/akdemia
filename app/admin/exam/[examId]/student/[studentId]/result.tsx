import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { processingApi, examApi } from '../../../../../../src/data/api';
import { ExamAttempt, Answer, Student } from '../../../../../../src/domain/entities';
import { useToast } from '../../../../../../src/presentation/components/common';

export default function StudentResultScreen() {
    const { examId, studentId } = useLocalSearchParams<{ examId: string; studentId: string }>();
    const { showToast } = useToast();

    const [result, setResult] = useState<ExamAttempt | null>(null);
    const [studentName, setStudentName] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        try {
            const [resultData, studentData] = await Promise.all([
                processingApi.getResults(examId!, studentId!),
                examApi.getStudents(examId!).then((students: Student[]) =>
                    students.find((s: Student) => s.studentId === studentId)
                ),
            ]);
            setResult(resultData);
            setStudentName(studentData?.fullName || 'Estudiante');
        } catch (error) {
            console.error(error);
            showToast('Error al cargar resultados', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (examId && studentId) {
            loadData();
        }
    }, [examId, studentId]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={{ marginTop: 12, color: '#6b7280' }}>Cargando resultados...</Text>
            </View>
        );
    }

    if (!result || result.status !== 'COMPLETED') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }} edges={['bottom']}>
                <Ionicons name="hourglass-outline" size={64} color="#f59e0b" />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 }}>
                    Sin resultados
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                    {result?.status === 'PROCESSING'
                        ? 'La hoja de respuestas aún está siendo procesada'
                        : 'Este estudiante aún no ha enviado su hoja de respuestas'}
                </Text>
            </SafeAreaView>
        );
    }

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return '#22c55e';
        if (percentage >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getAnswerColor = (status: string) => {
        switch (status) {
            case 'correct': return { bg: '#dcfce7', text: '#15803d' };
            case 'incorrect': return { bg: '#fee2e2', text: '#dc2626' };
            default: return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    const scoreColor = getScoreColor(result.percentage || 0);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
            <ScrollView>
                {/* Student Header */}
                <View style={{ backgroundColor: '#1e40af', padding: 20 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Resultados de</Text>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{studentName}</Text>
                </View>

                {/* Score Card */}
                <View style={{
                    backgroundColor: 'white',
                    margin: 16,
                    borderRadius: 16,
                    padding: 20,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                }}>
                    <View style={{
                        width: 120,
                        height: 120,
                        borderRadius: 60,
                        borderWidth: 8,
                        borderColor: scoreColor,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 16,
                    }}>
                        <Text style={{ fontSize: 36, fontWeight: 'bold', color: scoreColor }}>
                            {result.percentage}%
                        </Text>
                    </View>

                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                        {result.totalCorrect} de {result.totalQuestions} correctas
                    </Text>

                    <View style={{ flexDirection: 'row', marginTop: 16, gap: 16 }}>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#dcfce7',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Text style={{ fontWeight: 'bold', color: '#15803d' }}>{result.totalCorrect}</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Correctas</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#fee2e2',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Text style={{ fontWeight: 'bold', color: '#dc2626' }}>{result.totalIncorrect}</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Incorrectas</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#f3f4f6',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                                <Text style={{ fontWeight: 'bold', color: '#6b7280' }}>{result.totalBlank}</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>En blanco</Text>
                        </View>
                    </View>
                </View>

                {/* Answers Grid */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                        Detalle de Respuestas
                    </Text>

                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 12,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                    }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {result.answers?.map((answer: Answer) => {
                                const colors = getAnswerColor(answer.status);
                                return (
                                    <View
                                        key={answer.questionNumber}
                                        style={{
                                            width: 56,
                                            padding: 8,
                                            borderRadius: 8,
                                            backgroundColor: colors.bg,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, color: colors.text }}>P{answer.questionNumber}</Text>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>
                                            {answer.selectedOption !== null ? String.fromCharCode(65 + answer.selectedOption) : '-'}
                                        </Text>
                                        {answer.status === 'incorrect' && (
                                            <Text style={{ fontSize: 9, color: '#15803d' }}>
                                                → {String.fromCharCode(65 + answer.correctOption)}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* Legend */}
                <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#dcfce7', marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>Correcta</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fee2e2', marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>Incorrecta</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#f3f4f6', marginRight: 4 }} />
                            <Text style={{ fontSize: 12, color: '#6b7280' }}>En blanco</Text>
                        </View>
                    </View>
                </View>

                {/* Confidence */}
                <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                    <View style={{
                        backgroundColor: '#eff6ff',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <Ionicons name="analytics" size={24} color="#1e40af" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e40af' }}>
                                Confianza del procesamiento
                            </Text>
                            <Text style={{ fontSize: 13, color: '#3b82f6' }}>
                                {Math.round((result.confidenceScore || 0) * 100)}% de precisión en la detección
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
