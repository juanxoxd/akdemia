export interface Student {
  studentId: string;
  examId: string;
  studentCode: string;
  fullName: string;
  email: string;
}

export interface StudentRegistrationRequest {
  studentCode: string;
  fullName: string;
  email: string;
}

export interface StudentRegistrationResponse {
  studentId: string;
  examId: string;
}
