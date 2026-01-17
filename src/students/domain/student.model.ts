import { StudentStatus } from '@omr/shared-types';

export class StudentModel {
  id: string;
  code: string;
  fullName: string;
  email?: string;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<StudentModel>) {
    Object.assign(this, partial);
  }
}
