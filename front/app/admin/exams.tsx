import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { examApi } from '../../src/data/api';
import { Exam } from '../../src/domain/entities';
import { LoadingSpinner } from '../../src/presentation/components/common';

export default function AdminExamsScreen() {
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadExams = async () => {
        try {
            const data = await examApi.getExams();
            setExams(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudieron cargar los exámenes');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadExams();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        loadExams();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return { bg: '#dcfce7', text: '#15803d', label: 'Activo' };
            case 'closed':
                return { bg: '#fee2e2', text: '#dc2626', label: 'Cerrado' };
            default:
                return { bg: '#fef3c7', text: '#d97706', label: 'Borrador' };
        }
    };

    if (isLoading) {
        return <LoadingSpinner fullScreen message="Cargando exámenes..." />;
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
            <FlatList
                data={exams}
                keyExtractor={(item) => item.examId}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#1e40af']}
                    />
                }
                ListHeaderComponent={() => (
                    <View style={{ marginBottom: 16 }}>
                        <TouchableOpacity
                            onPress={() => router.push('/admin/create-exam')}
                            style={{
                                backgroundColor: '#1e40af',
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="white" />
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                                Crear Nuevo Examen
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                renderItem={({ item }) => {
                    const status = getStatusColor(item.status);
                    return (
                        <TouchableOpacity
                            onPress={() => Alert.alert('Próximamente', 'Edición de examen en desarrollo')}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 12,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                                        {item.title}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                                        {item.totalQuestions} preguntas • {item.date}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        backgroundColor: status.bg,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderRadius: 12,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: status.text }}>
                                        {status.label}
                                    </Text>
                                </View>
                            </View>

                            {/* Actions */}
                            <View style={{ flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 }}>
                                <TouchableOpacity
                                    onPress={() => router.push(`/admin/exam/${item.examId}/answer-key` as any)}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}
                                >
                                    <Ionicons name="cloud-upload-outline" size={18} color="#1e40af" />
                                    <Text style={{ fontSize: 13, color: '#1e40af', marginLeft: 4 }}>Answer Key</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => router.push(`/admin/exam/${item.examId}/students` as any)}
                                    style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}
                                >
                                    <Ionicons name="people-outline" size={18} color="#6b7280" />
                                    <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>Estudiantes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => router.push('/admin/stats')}
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                >
                                    <Ionicons name="stats-chart-outline" size={18} color="#6b7280" />
                                    <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>Stats</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={() => (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
                        <Text style={{ fontSize: 18, color: '#6b7280', marginTop: 16, fontWeight: '500' }}>
                            No hay exámenes
                        </Text>
                        <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>
                            Crea tu primer examen usando el botón de arriba
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}
