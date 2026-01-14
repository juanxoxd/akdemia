import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exam, Student } from '../domain/entities';

interface ExamState {
  // Exam data
  exams: Exam[];
  selectedExam: Exam | null;
  isLoadingExams: boolean;
  examsError: string | null;
  
  // Student data
  currentStudent: Omit<Student, 'studentId' | 'examId'> | null;
  registeredStudent: Student | null;
  
  // Actions
  setExams: (exams: Exam[]) => void;
  selectExam: (exam: Exam | null) => void;
  setLoadingExams: (loading: boolean) => void;
  setExamsError: (error: string | null) => void;
  setCurrentStudent: (student: Omit<Student, 'studentId' | 'examId'> | null) => void;
  setRegisteredStudent: (student: Student | null) => void;
  resetExamState: () => void;
}

const initialState = {
  exams: [],
  selectedExam: null,
  isLoadingExams: false,
  examsError: null,
  currentStudent: null,
  registeredStudent: null,
};

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setExams: (exams) => set({ exams }),
      selectExam: (exam) => set({ selectedExam: exam }),
      setLoadingExams: (loading) => set({ isLoadingExams: loading }),
      setExamsError: (error) => set({ examsError: error }),
      setCurrentStudent: (student) => set({ currentStudent: student }),
      setRegisteredStudent: (student) => set({ registeredStudent: student }),
      resetExamState: () => set({
        selectedExam: null,
        registeredStudent: null,
      }),
    }),
    {
      name: 'exam-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentStudent: state.currentStudent, // Persist student data for reuse
      }),
    }
  )
);
