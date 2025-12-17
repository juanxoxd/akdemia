import { create } from 'zustand';
import { CapturedImage, DetectionResult } from '../domain/entities';

export type CaptureMode = 'auto' | 'manual';
export type CameraFacing = 'front' | 'back';

interface CaptureState {
  // Camera state
  isCameraReady: boolean;
  cameraPermission: 'undetermined' | 'granted' | 'denied';
  cameraFacing: CameraFacing;
  flashEnabled: boolean;
  
  // Detection state
  detectionResult: DetectionResult | null;
  isDetecting: boolean;
  captureMode: CaptureMode;
  stableStartTime: number | null;
  
  // Captured image
  capturedImage: CapturedImage | null;
  isProcessingImage: boolean;
  
  // Actions
  setCameraReady: (ready: boolean) => void;
  setCameraPermission: (permission: 'undetermined' | 'granted' | 'denied') => void;
  toggleCameraFacing: () => void;
  toggleFlash: () => void;
  setDetectionResult: (result: DetectionResult | null) => void;
  setIsDetecting: (detecting: boolean) => void;
  setCaptureMode: (mode: CaptureMode) => void;
  setStableStartTime: (time: number | null) => void;
  setCapturedImage: (image: CapturedImage | null) => void;
  setIsProcessingImage: (processing: boolean) => void;
  resetCaptureState: () => void;
}

const initialState = {
  isCameraReady: false,
  cameraPermission: 'undetermined' as const,
  cameraFacing: 'back' as CameraFacing,
  flashEnabled: false,
  detectionResult: null,
  isDetecting: false,
  captureMode: 'auto' as CaptureMode,
  stableStartTime: null,
  capturedImage: null,
  isProcessingImage: false,
};

export const useCaptureStore = create<CaptureState>((set) => ({
  ...initialState,
  
  setCameraReady: (ready) => set({ isCameraReady: ready }),
  setCameraPermission: (permission) => set({ cameraPermission: permission }),
  toggleCameraFacing: () => set((state) => ({
    cameraFacing: state.cameraFacing === 'back' ? 'front' : 'back'
  })),
  toggleFlash: () => set((state) => ({ flashEnabled: !state.flashEnabled })),
  setDetectionResult: (result) => set({ detectionResult: result }),
  setIsDetecting: (detecting) => set({ isDetecting: detecting }),
  setCaptureMode: (mode) => set({ captureMode: mode }),
  setStableStartTime: (time) => set({ stableStartTime: time }),
  setCapturedImage: (image) => set({ capturedImage: image }),
  setIsProcessingImage: (processing) => set({ isProcessingImage: processing }),
  resetCaptureState: () => set(initialState),
}));
