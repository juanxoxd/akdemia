import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { examApi } from '../../src/data/api';
import { useToast } from '../../src/presentation/components/common';

export default function CreateExamScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        examTitle: '',
        description: '',
        totalQuestions: '20',
        answersPerQuestion: '5',
        examDate: new Date().toISOString().split('T')[0],
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.examTitle.trim()) {
            showToast('El título del examen es requerido', 'error');
            return;
        }

        const totalQuestions = parseInt(formData.totalQuestions, 10);
        const answersPerQuestion = parseInt(formData.answersPerQuestion, 10);

        if (isNaN(totalQuestions) || totalQuestions < 5 || totalQuestions > 100) {
            showToast('El número de preguntas debe ser entre 5 y 100', 'error');
            return;
        }

        if (isNaN(answersPerQuestion) || answersPerQuestion < 2 || answersPerQuestion > 6) {
            showToast('Las opciones por pregunta deben ser entre 2 y 6', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await examApi.createExam({
                examTitle: formData.examTitle,
                description: formData.description || undefined,
                totalQuestions,
                answersPerQuestion,
                examDate: formData.examDate,
            });

            showToast('¡Examen creado correctamente!', 'success');

            // Navigate to exams list after short delay
            setTimeout(() => {
                router.replace('/admin/exams');
            }, 500);
        } catch (error) {
            showToast('No se pudo crear el examen. Intenta de nuevo.', 'error');
            console.error(error);
            setIsLoading(false);
        }
    };

    // Loading overlay
    if (isLoading) {
        return (
            <Modal visible transparent animationType="fade">
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 32,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 12,
                        elevation: 8,
                    }}>
                        <ActivityIndicator size="large" color="#1e40af" />
                        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#374151' }}>
                            Creando examen...
                        </Text>
                        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                            Por favor espera
                        </Text>
                    </View>
                </View>
            </Modal>
        );
    }


    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ padding: 16 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Form Card */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 16,
                            padding: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 3,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <Ionicons name="create-outline" size={28} color="#1e40af" />
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 8 }}>
                                Nuevo Examen
                            </Text>
                        </View>

                        {/* Title */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                Título del Examen *
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                    color: '#111827',
                                }}
                                placeholder="Ej: Examen Parcial - Matemáticas I"
                                value={formData.examTitle}
                                onChangeText={(v) => handleChange('examTitle', v)}
                                maxLength={255}
                            />
                        </View>

                        {/* Description */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                Descripción (opcional)
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                    color: '#111827',
                                    minHeight: 80,
                                    textAlignVertical: 'top',
                                }}
                                placeholder="Describe el contenido del examen..."
                                value={formData.description}
                                onChangeText={(v) => handleChange('description', v)}
                                multiline
                                maxLength={1000}
                            />
                        </View>

                        {/* Questions and Options Row */}
                        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                    N° Preguntas *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: 8,
                                        padding: 12,
                                        fontSize: 16,
                                        color: '#111827',
                                        textAlign: 'center',
                                    }}
                                    placeholder="20"
                                    value={formData.totalQuestions}
                                    onChangeText={(v) => handleChange('totalQuestions', v.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                    Opciones/Pregunta *
                                </Text>
                                <TextInput
                                    style={{
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: 8,
                                        padding: 12,
                                        fontSize: 16,
                                        color: '#111827',
                                        textAlign: 'center',
                                    }}
                                    placeholder="5"
                                    value={formData.answersPerQuestion}
                                    onChangeText={(v) => handleChange('answersPerQuestion', v.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                    maxLength={1}
                                />
                            </View>
                        </View>

                        {/* Exam Date */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                                Fecha del Examen *
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 16,
                                    color: '#111827',
                                }}
                                placeholder="YYYY-MM-DD"
                                value={formData.examDate}
                                onChangeText={(v) => handleChange('examDate', v)}
                            />
                            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                Formato: AAAA-MM-DD (ej: 2025-12-28)
                            </Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isLoading}
                            style={{
                                backgroundColor: isLoading ? '#93c5fd' : '#1e40af',
                                borderRadius: 12,
                                padding: 16,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons
                                name={isLoading ? 'hourglass-outline' : 'checkmark-circle-outline'}
                                size={20}
                                color="white"
                            />
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                                {isLoading ? 'Creando...' : 'Crear Examen'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Card */}
                    <View
                        style={{
                            backgroundColor: '#eff6ff',
                            borderRadius: 12,
                            padding: 16,
                            marginTop: 16,
                            flexDirection: 'row',
                        }}
                    >
                        <Ionicons name="information-circle" size={24} color="#1e40af" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e40af', marginBottom: 4 }}>
                                Siguiente paso
                            </Text>
                            <Text style={{ fontSize: 13, color: '#3b82f6', lineHeight: 18 }}>
                                Después de crear el examen, podrás subir la hoja de respuestas (Answer Key)
                                desde la pantalla de Gestión de Exámenes.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
