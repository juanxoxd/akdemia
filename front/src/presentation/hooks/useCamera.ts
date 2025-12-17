import { useCallback, useEffect, useRef } from 'react';
import { Camera, CameraView } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useCaptureStore } from '../../store';
import { ENV } from '../../config/env';
import { CapturedImage } from '../../domain/entities';

export const useCamera = () => {
  const cameraRef = useRef<CameraView>(null);
  const {
    isCameraReady,
    cameraPermission,
    cameraFacing,
    flashEnabled,
    setCameraReady,
    setCameraPermission,
    toggleCameraFacing,
    toggleFlash,
    setCapturedImage,
    setIsProcessingImage,
  } = useCaptureStore();

  // Request camera permissions
  const requestPermission = useCallback(async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted' ? 'granted' : 'denied');
    return status === 'granted';
  }, [setCameraPermission]);

  // Check permissions on mount
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === 'granted') {
        setCameraPermission('granted');
      } else if (status === 'denied') {
        setCameraPermission('denied');
      }
    };
    checkPermission();
  }, [setCameraPermission]);

  // Capture image
  const captureImage = useCallback(async (): Promise<CapturedImage | null> => {
    if (!cameraRef.current) return null;

    try {
      setIsProcessingImage(true);

      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: ENV.JPEG_QUALITY,
        base64: true,
        exif: false, // Remove EXIF for privacy
      });

      if (!photo) return null;

      // Process image - resize and optimize
      const processed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            resize: {
              width: ENV.OUTPUT_WIDTH,
              height: ENV.OUTPUT_HEIGHT,
            },
          },
        ],
        {
          compress: ENV.JPEG_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      // Calculate size
      const base64Length = processed.base64?.length || 0;
      const sizeInMB = (base64Length * 3) / 4 / 1024 / 1024;

      const capturedImage: CapturedImage = {
        uri: processed.uri,
        base64: processed.base64,
        width: processed.width,
        height: processed.height,
        sizeInMB,
      };

      setCapturedImage(capturedImage);
      return capturedImage;
    } catch (error) {
      console.error('Error capturing image:', error);
      return null;
    } finally {
      setIsProcessingImage(false);
    }
  }, [setCapturedImage, setIsProcessingImage]);

  return {
    cameraRef,
    isCameraReady,
    cameraPermission,
    cameraFacing,
    flashEnabled,
    requestPermission,
    captureImage,
    toggleCameraFacing,
    toggleFlash,
    onCameraReady: () => setCameraReady(true),
  };
};
