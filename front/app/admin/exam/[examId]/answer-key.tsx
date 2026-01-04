import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { examApi, processingApi } from '../../../../src/data/api';
import { useToast } from '../../../../src/presentation/components/common';
import { useCaptureStore } from '../../../../src/store';

export default function AnswerKeyScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { capturedImage, resetCaptureState } = useCaptureStore();

  const [exam, setExam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedAnswers, setDetectedAnswers] = useState<(number | null)[][] | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadExam = async () => {
    try {
      const examData = await examApi.getExam(examId!);
      setExam(examData);
    } catch (error) {
      showToast('Error al cargar examen', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      loadExam();
    }
  }, [examId]);

  // Process captured image when returning from camera
  useEffect(() => {
    if (capturedImage?.uri) {
      handleUpload(capturedImage.uri);
      resetCaptureState();
    }
  }, [capturedImage]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso requerido',
        'Necesitamos acceso a tu galería para seleccionar la imagen'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleUpload(result.assets[0].uri);
    }
  };

  // Navigate to capture screen with answer-key mode and green overlay
  const handleTakePhoto = () => {
    router.push({
      pathname: '/capture',
      params: { mode: 'answer-key', examId },
    } as any);
  };

  const handleUpload = async (imageUri: string) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = (await processingApi.uploadAnswerKey(
        examId!,
        imageUri,
        exam?.totalQuestions || 20,
        5,
        (progress: number) => setUploadProgress(progress)
      )) as {
        detectedAnswers: Array<{
          question_number: number;
          selected_option: number;
          selected_option_label: string;
          confidence_score: number;
          status: string;
        }>;
        success: boolean;
        message?: string;
      };

      console.log('[AnswerKey] Raw response:', response);

      // Map backend format to frontend format
      // Backend: [{question_number, selected_option, ...}, ...]
      // Frontend: [[0], [1], [2], ...] (array of arrays with option index, or [null] if not detected)
      if (response.detectedAnswers && Array.isArray(response.detectedAnswers)) {
        const totalQ = exam?.totalQuestions || 20;
        const mappedAnswers = response.detectedAnswers
          .slice(0, totalQ) // Limit to exam's total questions
          .map((item) => {
            // If it's already a number array, keep it
            if (Array.isArray(item)) {
              return item;
            }
            // Otherwise, extract the selected_option from the object
            // Preserve null if not detected
            const option = item.selected_option;
            return [option !== null && option !== undefined ? option : null];
          });
        console.log('[AnswerKey] Mapped answers (limited to', totalQ, '):', mappedAnswers);
        setDetectedAnswers(mappedAnswers);
      }

      setIsUploading(false);
      showToast('Respuestas detectadas correctamente', 'success');
    } catch (error) {
      setIsUploading(false);
      showToast('Error al procesar imagen', 'error');
      console.error(error);
    }
  };

  const handleConfirm = async () => {
    if (!detectedAnswers) return;

    setIsProcessing(true);
    try {
      // Convert null values to -1 before sending to backend
      const cleanedAnswers = detectedAnswers.map((answer) =>
        answer.map((val) => (val === null ? -1 : val))
      );
      await processingApi.confirmAnswerKey(examId!, cleanedAnswers);
      showToast('¡Answer key guardado correctamente!', 'success');
      router.back();
    } catch (error) {
      showToast('Error al guardar answer key', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditAnswer = (questionIndex: number) => {
    if (!detectedAnswers) return;

    const currentAnswer = detectedAnswers[questionIndex][0];
    const options = ['A', 'B', 'C', 'D', 'E'];

    Alert.alert(
      `Pregunta ${questionIndex + 1}`,
      'Selecciona la respuesta correcta',
      options.map((opt, i) => ({
        text: `${opt}${i === currentAnswer ? ' ✓' : ''}`,
        onPress: () => {
          const newAnswers = [...detectedAnswers];
          newAnswers[questionIndex] = [i];
          setDetectedAnswers(newAnswers);
        },
      }))
    );
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
        }}
      >
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }} edges={['bottom']}>
      {/* Upload Progress Modal */}
      <Modal visible={isUploading} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              width: 280,
            }}
          >
            <ActivityIndicator size="large" color="#1e40af" />
            <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#374151' }}>
              Procesando imagen...
            </Text>
            <View
              style={{
                width: '100%',
                height: 6,
                backgroundColor: '#e5e7eb',
                borderRadius: 3,
                marginTop: 16,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#1e40af',
                }}
              />
            </View>
            <Text style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
              {uploadProgress}% completado
            </Text>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header Card */}
        <View
          style={{
            backgroundColor: '#1e40af',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Answer Key para</Text>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
            {exam?.title || 'Examen'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8 }}>
            {exam?.totalQuestions || 20} preguntas
          </Text>
        </View>

        {!detectedAnswers ? (
          // Upload Options
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
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Subir Hoja de Respuestas
            </Text>

            <TouchableOpacity
              onPress={handleTakePhoto}
              style={{
                backgroundColor: '#eff6ff',
                borderRadius: 12,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#1e40af',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="camera" size={24} color="white" />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1e40af' }}>
                  Tomar Foto
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Usa la cámara para capturar</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePickImage}
              style={{
                backgroundColor: '#f3f4f6',
                borderRadius: 12,
                padding: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#6b7280',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="images" size={24} color="white" />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>
                  Seleccionar de Galería
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Elige una imagen existente</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          // Detected Answers
          <>
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                Respuestas Detectadas
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                Toca una respuesta para editarla si está incorrecta
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {detectedAnswers.map((answer, index) => {
                  const answerValue = answer[0];
                  const isNull =
                    answerValue === null || answerValue === undefined || answerValue === -1;

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleEditAnswer(index)}
                      style={{
                        width: 56,
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: isNull ? '#fef3c7' : '#eff6ff',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: isNull ? '#f59e0b' : '#1e40af',
                      }}
                    >
                      <Text style={{ fontSize: 10, color: '#6b7280' }}>P{index + 1}</Text>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: 'bold',
                          color: isNull ? '#f59e0b' : '#1e40af',
                        }}
                      >
                        {isNull ? '?' : String.fromCharCode(65 + answerValue)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isProcessing}
              style={{
                backgroundColor: isProcessing ? '#93c5fd' : '#22c55e',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                    Confirmar y Guardar
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Retake Button */}
            <TouchableOpacity
              onPress={() => setDetectedAnswers(null)}
              style={{
                marginTop: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#6b7280', fontSize: 14 }}>Volver a subir imagen</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Info */}
        <View
          style={{
            backgroundColor: '#fef3c7',
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
            flexDirection: 'row',
          }}
        >
          <Ionicons name="information-circle" size={24} color="#d97706" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400e' }}>Importante</Text>
            <Text style={{ fontSize: 13, color: '#a16207', lineHeight: 18 }}>
              Asegúrate de que la imagen sea clara y que todas las burbujas estén correctamente
              marcadas antes de confirmar.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
