import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { examApi } from '../../data/api';
import { useExamStore } from '../../store';
import { StudentRegistrationRequest } from '../../domain/entities';

export const useExams = () => {
  const { setExams, setLoadingExams, setExamsError } = useExamStore();

  const examsQuery = useQuery({
    queryKey: ['exams'],
    queryFn: examApi.getExams,
    staleTime: 1000 * 60 * 1, // 1 minute
    retry: 2,
  });

  // Sync with store using useEffect to avoid infinite re-renders (React 19)
  useEffect(() => {
    if (examsQuery.data && !examsQuery.isLoading) {
      setExams(examsQuery.data);
      setLoadingExams(false);
      setExamsError(null);
    }
  }, [examsQuery.data, examsQuery.isLoading, setExams, setLoadingExams, setExamsError]);

  useEffect(() => {
    if (examsQuery.isLoading) {
      setLoadingExams(true);
    }
  }, [examsQuery.isLoading, setLoadingExams]);

  useEffect(() => {
    if (examsQuery.error) {
      setExamsError((examsQuery.error as Error).message);
      setLoadingExams(false);
    }
  }, [examsQuery.error, setExamsError, setLoadingExams]);

  return {
    exams: examsQuery.data || [],
    isLoading: examsQuery.isLoading,
    error: examsQuery.error,
    refetch: examsQuery.refetch,
  };
};

export const useRegisterStudent = () => {
  const { setRegisteredStudent, selectedExam } = useExamStore();

  const mutation = useMutation({
    mutationFn: (data: StudentRegistrationRequest) => {
      if (!selectedExam) {
        throw new Error('No exam selected');
      }
      return examApi.registerStudent(selectedExam.examId, data);
    },
    onSuccess: (response) => {
      if (selectedExam) {
        setRegisteredStudent({
          studentId: response.studentId,
          examId: response.examId,
          studentCode: '',
          fullName: '',
          email: '',
        });
      }
    },
  });

  return {
    registerStudent: mutation.mutate,
    isRegistering: mutation.isPending,
    registrationError: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
};
