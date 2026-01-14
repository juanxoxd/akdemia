import { create } from 'zustand';
import { ExamAttempt, AttemptStatus } from '../domain/entities';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface ProcessingState {
  // Upload state
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadError: string | null;
  attemptId: string | null;
  
  // Polling state
  isPolling: boolean;
  pollingAttempts: number;
  lastPolledStatus: AttemptStatus | null;
  
  // Results
  examAttempt: ExamAttempt | null;
  processingError: string | null;
  
  // Actions
  setUploadStatus: (status: UploadStatus) => void;
  setUploadProgress: (progress: number) => void;
  setUploadError: (error: string | null) => void;
  setAttemptId: (id: string | null) => void;
  setIsPolling: (polling: boolean) => void;
  incrementPollingAttempts: () => void;
  resetPollingAttempts: () => void;
  setLastPolledStatus: (status: AttemptStatus | null) => void;
  setExamAttempt: (attempt: ExamAttempt | null) => void;
  setProcessingError: (error: string | null) => void;
  resetProcessingState: () => void;
}

const initialState = {
  uploadStatus: 'idle' as UploadStatus,
  uploadProgress: 0,
  uploadError: null,
  attemptId: null,
  isPolling: false,
  pollingAttempts: 0,
  lastPolledStatus: null,
  examAttempt: null,
  processingError: null,
};

export const useProcessingStore = create<ProcessingState>((set) => ({
  ...initialState,
  
  setUploadStatus: (status) => set({ uploadStatus: status }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setUploadError: (error) => set({ uploadError: error }),
  setAttemptId: (id) => set({ attemptId: id }),
  setIsPolling: (polling) => set({ isPolling: polling }),
  incrementPollingAttempts: () => set((state) => ({
    pollingAttempts: state.pollingAttempts + 1
  })),
  resetPollingAttempts: () => set({ pollingAttempts: 0 }),
  setLastPolledStatus: (status) => set({ lastPolledStatus: status }),
  setExamAttempt: (attempt) => set({ examAttempt: attempt }),
  setProcessingError: (error) => set({ processingError: error }),
  resetProcessingState: () => set(initialState),
}));
