// Repository exports will be added when using with NestJS
// For now, we export repository interfaces

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface IExamRepository<T> extends IBaseRepository<T> {
  findByStatus(status: string): Promise<T[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<T[]>;
}

export interface IStudentRepository<T> extends IBaseRepository<T> {
  findByCode(code: string): Promise<T | null>;
  findByEmail(email: string): Promise<T | null>;
}

export interface IExamAttemptRepository<T> extends IBaseRepository<T> {
  findByExamId(examId: string): Promise<T[]>;
  findByStudentId(studentId: string): Promise<T[]>;
  findByExamAndStudent(examId: string, studentId: string): Promise<T | null>;
}
