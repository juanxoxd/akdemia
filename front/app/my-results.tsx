import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MyResultsScreen() {
    // Mock results data
    const results = [
        {
            id: '1',
            examTitle: 'Examen Parcial - Matemáticas I',
            date: '2025-12-28',
            score: 18,
            totalQuestions: 20,
            percentage: 90,
            status: 'passed',
        },
        {
            id: '2',
            examTitle: 'Quiz - Química Orgánica',
            date: '2025-12-25',
            score: 12,
            totalQuestions: 15,
            percentage: 80,
            status: 'passed',
        },
        {
            id: '3',
            examTitle: 'Examen Final - Física General',
            date: '2025-12-20',
            score: 15,
            totalQuestions: 30,
            percentage: 50,
            status: 'failed',
        },
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
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
                            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>73%</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Promedio</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>3</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Exámenes</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#86efac', fontSize: 32, fontWeight: 'bold' }}>2</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Aprobados</Text>
                        </View>
                    </View>
                </View>

                {/* Results List */}
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                    Historial de Exámenes
                </Text>

                {results.map((result) => (
                    <View
                        key={result.id}
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                                    {result.examTitle}
                                </Text>
                                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                    {result.date}
                                </Text>
                            </View>
                            <View
                                style={{
                                    backgroundColor: result.status === 'passed' ? '#dcfce7' : '#fee2e2',
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
                                        color: result.status === 'passed' ? '#15803d' : '#dc2626',
                                    }}
                                >
                                    {result.status === 'passed' ? 'Aprobado' : 'Desaprobado'}
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
                                        width: `${result.percentage}%`,
                                        backgroundColor: result.percentage >= 60 ? '#22c55e' : '#ef4444',
                                        borderRadius: 4,
                                    }}
                                />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: '#6b7280' }}>
                                {result.score}/{result.totalQuestions} correctas
                            </Text>
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: 'bold',
                                    color: result.percentage >= 60 ? '#15803d' : '#dc2626',
                                }}
                            >
                                {result.percentage}%
                            </Text>
                        </View>
                    </View>
                ))}

                {/* Empty State */}
                {results.length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                        <Text style={{ fontSize: 18, color: '#6b7280', marginTop: 16, fontWeight: '500' }}>
                            Sin resultados
                        </Text>
                        <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
                            Tus resultados de exámenes aparecerán aquí después de completar uno.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
