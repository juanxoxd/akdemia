import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { examApi } from '../../../../src/data/api';
import { Student } from '../../../../src/domain/entities';
import { useToast } from '../../../../src/presentation/components/common';

export default function ExamStudentsScreen() {
    const { examId } = useLocalSearchParams<{ examId: string }>();
    const router = useRouter();
    const { showToast } = useToast();

    const [students, setStudents] = useState<Student[]>([]);
    const [examTitle, setExamTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newStudent, setNewStudent] = useState({
        studentCode: '',
        fullName: '',
        email: '',
    });
    const [isAdding, setIsAdding] = useState(false);

    const loadData = async () => {
        try {
            const [studentsData, examData] = await Promise.all([
                examApi.getStudents(examId!),
                examApi.getExam(examId!),
            ]);
            setStudents(studentsData);
            setExamTitle(examData.title);
        } catch (error) {
            console.error(error);
            showToast('Error al cargar estudiantes', 'error');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (examId) {
            loadData();
        }
    }, [examId]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleAddStudent = async () => {
        if (!newStudent.studentCode.trim() || !newStudent.fullName.trim()) {
            showToast('Código y nombre son requeridos', 'error');
            return;
        }

        setIsAdding(true);
        try {
            await examApi.registerStudent(examId!, {
                studentCode: newStudent.studentCode,
                fullName: newStudent.fullName,
                email: newStudent.email || `${newStudent.studentCode}@temp.com`,
            });
            showToast('Estudiante agregado correctamente', 'success');
            setShowAddModal(false);
            setNewStudent({ studentCode: '', fullName: '', email: '' });
            loadData();
        } catch (error) {
            showToast('Error al agregar estudiante', 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const handleViewResult = (student: Student) => {
        router.push(`/admin/exam/${examId}/student/${student.studentId}/result` as any);
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={{ marginTop: 12, color: '#6b7280' }}>Cargando estudiantes...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
            {/* Header Info */}
            <View style={{ backgroundColor: '#1e40af', padding: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Examen</Text>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{examTitle}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
                    {students.length} estudiante(s) registrado(s)
                </Text>
            </View>

            <FlatList
                data={students}
                keyExtractor={(item) => item.studentId}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1e40af']} />
                }
                ListHeaderComponent={() => (
                    <TouchableOpacity
                        onPress={() => setShowAddModal(true)}
                        style={{
                            backgroundColor: '#1e40af',
                            borderRadius: 12,
                            padding: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Ionicons name="person-add-outline" size={20} color="white" />
                        <Text style={{ color: 'white', fontSize: 15, fontWeight: '600', marginLeft: 8 }}>
                            Agregar Estudiante
                        </Text>
                    </TouchableOpacity>
                )}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => handleViewResult(item)}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                    >
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: '#eff6ff',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <Ionicons name="person" size={24} color="#1e40af" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                                {item.fullName}
                            </Text>
                            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                                Código: {item.studentCode}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <Ionicons name="people-outline" size={64} color="#d1d5db" />
                        <Text style={{ fontSize: 18, color: '#6b7280', marginTop: 16, fontWeight: '500' }}>
                            Sin estudiantes
                        </Text>
                        <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
                            Agrega estudiantes usando el botón de arriba
                        </Text>
                    </View>
                )}
            />

            {/* Add Student Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end',
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                                Agregar Estudiante
                            </Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                Código de Estudiante *
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                }}
                                placeholder="Ej: 20210001"
                                value={newStudent.studentCode}
                                onChangeText={(v) => setNewStudent(prev => ({ ...prev, studentCode: v }))}
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                Nombre Completo *
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                }}
                                placeholder="Ej: Juan Pérez García"
                                value={newStudent.fullName}
                                onChangeText={(v) => setNewStudent(prev => ({ ...prev, fullName: v }))}
                            />
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                Email (opcional)
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                }}
                                placeholder="estudiante@email.com"
                                value={newStudent.email}
                                onChangeText={(v) => setNewStudent(prev => ({ ...prev, email: v }))}
                                keyboardType="email-address"
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleAddStudent}
                            disabled={isAdding}
                            style={{
                                backgroundColor: isAdding ? '#93c5fd' : '#1e40af',
                                borderRadius: 12,
                                padding: 16,
                                alignItems: 'center',
                            }}
                        >
                            {isAdding ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                                    Agregar Estudiante
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
