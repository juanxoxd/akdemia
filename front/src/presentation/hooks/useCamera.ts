import { useCallback, useEffect, useRef } from 'react';
import { Camera, CameraView, CameraCapturedPicture } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useCaptureStore } from '../../store';
import { ENV } from '../../config/env';
import { CapturedImage } from '../../domain/entities';

// Raw photo type from camera
export interface RawPhoto {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

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

  // Check permissions on mount - don't set denied immediately, request first if needed
  useEffect(() => {
    const checkPermission = async () => {
      console.log('[useCamera] Checking camera permissions...');
      const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
      console.log('[useCamera] Permission status:', status, 'canAskAgain:', canAskAgain);

      if (status === 'granted') {
        setCameraPermission('granted');
      } else if (status === 'undetermined' || canAskAgain) {
        // If undetermined or we can ask again, keep as undetermined so the UI can request
        console.log('[useCamera] Permission not granted but can ask, keeping as undetermined');
        setCameraPermission('undetermined');
      } else {
        // Only set denied if we truly cannot ask again
        setCameraPermission('denied');
      }
    };
    checkPermission();
  }, [setCameraPermission]);

  // Capture raw image (full resolution, no processing)
  const captureRawImage = useCallback(async (): Promise<RawPhoto | null> => {
    if (!cameraRef.current || !isCameraReady) return null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: true, // Faster, full resolution
      });

      if (!photo) return null;

      return {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      };
    } catch (error) {
      console.error('Camera capture failed:', error);
      return null;
    }
  }, [isCameraReady]);

  // Crop image to frame using ENV margins
  const cropToFrame = useCallback(async (rawPhoto: RawPhoto): Promise<CapturedImage | null> => {
    try {
      const { uri, width: imgWidth, height: imgHeight } = rawPhoto;

      // Calculate crop area using same percentages as overlay
      const originX = imgWidth * ENV.FRAME_MARGIN_HORIZONTAL;
      const originY = imgHeight * ENV.FRAME_MARGIN_TOP;
      const cropWidth = imgWidth * (1 - ENV.FRAME_MARGIN_HORIZONTAL * 2);
      const cropHeight = imgHeight * (1 - ENV.FRAME_MARGIN_TOP - ENV.FRAME_MARGIN_BOTTOM);

      // Crop and optimize
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(cropWidth),
              height: Math.round(cropHeight),
            },
          },
          {
            resize: {
              width: ENV.OUTPUT_WIDTH,
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

      return {
        uri: processed.uri,
        base64: processed.base64,
        width: processed.width,
        height: processed.height,
        sizeInMB,
      };
    } catch (error) {
      console.error('Error cropping image:', error);
      return null;
    }
  }, []);

  // Capture and crop in one step (convenience method)
  const captureImage = useCallback(async (): Promise<CapturedImage | null> => {
    try {
      setIsProcessingImage(true);

      // 1. Capture raw photo
      const rawPhoto = await captureRawImage();
      if (!rawPhoto) return null;

      // 2. Crop to frame
      const croppedImage = await cropToFrame(rawPhoto);
      if (!croppedImage) return null;

      // 3. Store in state
      setCapturedImage(croppedImage);
      return croppedImage;
    } catch (error) {
      console.error('Error capturing image:', error);
      return null;
    } finally {
      setIsProcessingImage(false);
    }
  }, [captureRawImage, cropToFrame, setCapturedImage, setIsProcessingImage]);

  return {
    cameraRef,
    isCameraReady,
    cameraPermission,
    cameraFacing,
    flashEnabled,
    requestPermission,
    captureImage,
    captureRawImage,
    cropToFrame,
    toggleCameraFacing,
    toggleFlash,
    onCameraReady: () => setCameraReady(true),
    setCameraPermission,
  };
};
