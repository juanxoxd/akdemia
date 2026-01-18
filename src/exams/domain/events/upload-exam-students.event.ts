export class UploadExamStudentsEvent {
  constructor(
    public readonly examId: string,
    public readonly redisKey: string,
  ) {}
}
