import { useCallback, useEffect, useRef } from 'react';
import { processingApi } from '../../data/api';
import { useProcessingStore, useExamStore, useCaptureStore } from '../../store';
import { ENV } from '../../config/env';

export const useProcessing = () => {
  const {
    uploadStatus,
    uploadProgress,
    uploadError,
    attemptId,
    isPolling,
    pollingAttempts,
    examAttempt,
    processingError,
    setUploadStatus,
    setUploadProgress,
    setUploadError,
    setAttemptId,
    setIsPolling,
    incrementPollingAttempts,
    resetPollingAttempts,
    setExamAttempt,
    setProcessingError,
    resetProcessingState,
  } = useProcessingStore();

  const { registeredStudent, selectedExam } = useExamStore();
  const { capturedImage } = useCaptureStore();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Submit answer sheet
  const submitAnswerSheet = useCallback(async () => {
    if (!registeredStudent || !selectedExam || !capturedImage) {
      setUploadError('Missing required data');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      setUploadError(null);

      const response = await processingApi.submitAnswerSheet(
        selectedExam.examId,
        registeredStudent.studentId,
        capturedImage.uri,
        (progress) => setUploadProgress(progress)
      );

      setAttemptId(response.attemptId);
      setUploadStatus('success');
      return response;
    } catch (error) {
      setUploadStatus('error');
      setUploadError((error as Error).message);
      throw error;
    }
  }, [
    registeredStudent,
    selectedExam,
    capturedImage,
    setUploadStatus,
    setUploadProgress,
    setUploadError,
    setAttemptId,
  ]);

  // Start polling for results
  const startPolling = useCallback(() => {
    if (!registeredStudent || !selectedExam) {
      setProcessingError('Missing student or exam data');
      return;
    }

    resetPollingAttempts();
    setIsPolling(true);
    setProcessingError(null);

    const poll = async () => {
      try {
        const result = await processingApi.getResults(
          selectedExam.examId,
          registeredStudent.studentId
        );

        setExamAttempt(result);

        // Status values are lowercase from the API: 'completed', 'failed', 'needs_review', 'processing', 'pending'
        if (result.status === 'completed' || result.status === 'failed' || result.status === 'needs_review') {
          stopPolling();
          return;
        }

        incrementPollingAttempts();

        // Check max attempts
        if (pollingAttempts >= ENV.MAX_POLLING_ATTEMPTS) {
          stopPolling();
          setProcessingError('Polling timeout - please try again later');
        }
      } catch (error) {
        console.error('Polling error:', error);
        incrementPollingAttempts();

        if (pollingAttempts >= ENV.MAX_POLLING_ATTEMPTS) {
          stopPolling();
          setProcessingError((error as Error).message);
        }
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, ENV.POLLING_INTERVAL);
  }, [
    registeredStudent,
    selectedExam,
    pollingAttempts,
    resetPollingAttempts,
    setIsPolling,
    setExamAttempt,
    setProcessingError,
    incrementPollingAttempts,
  ]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, [setIsPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    uploadStatus,
    uploadProgress,
    uploadError,
    attemptId,
    isPolling,
    pollingAttempts,
    examAttempt,
    processingError,
    submitAnswerSheet,
    startPolling,
    stopPolling,
    resetProcessingState,
  };
};
