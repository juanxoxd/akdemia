import React from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImagePreview } from '../src/presentation/components/camera/ImagePreview';
import { LoadingSpinner } from '../src/presentation/components/common/LoadingSpinner';
import { ProgressBar } from '../src/presentation/components/common/ProgressBar';
import { useCaptureStore, useProcessingStore } from '../src/store';
import { useProcessing } from '../src/presentation/hooks/useProcessing';

export default function PreviewScreen() {
  const router = useRouter();
  const { capturedImage, setCapturedImage } = useCaptureStore();
  const { 
    uploadStatus, 
    uploadProgress, 
    submitAnswerSheet,
    startPolling,
    resetProcessingState,
  } = useProcessing();

  const handleConfirm = async () => {
    try {
      await submitAnswerSheet();
      // Start polling for results
      startPolling();
      // Navigate to results
      router.replace('/results');
    } catch (error) {
      Alert.alert(
        'Error de Envío',
        (error as Error).message || 'No se pudo enviar la imagen. Intente de nuevo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reintentar', onPress: handleConfirm },
        ]
      );
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    resetProcessingState();
    router.back();
  };

  if (!capturedImage) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <LoadingSpinner message="No hay imagen para mostrar" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1">
        <ImagePreview
          image={capturedImage}
          onConfirm={handleConfirm}
          onRetry={handleRetry}
          isUploading={uploadStatus === 'uploading'}
        />

        {/* Upload progress overlay */}
        {uploadStatus === 'uploading' && (
          <View className="absolute bottom-32 left-6 right-6">
            <ProgressBar 
              progress={uploadProgress} 
              color="primary"
              showLabel
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
