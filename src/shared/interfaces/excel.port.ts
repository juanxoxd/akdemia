import { WorkBook } from 'xlsx-color';

export interface ExcelPort {
  readExcel(file: Buffer): WorkBook;
  convertSheetExcelToJson<T>(workbook: WorkBook, sheetNumber: number): T[];
  validateHeaders(headers: string[], headersReceived: string[]): void;
  validateNumberOfRows(rows: unknown[], limit?: number): void;
  validateDuplicatesByColumn<T>(
    array: T[],
    field: string,
    valuesIgnore?: any,
  ): void;
  createExcelBuffer<T>(data: T[], hasErrors?: boolean): Buffer;
  createCSVBuffer<T>(data: T[]): Buffer;
  validateValuesByColumn<T>(
    rows: T[],
    column: string,
    emptyValues?: unknown[],
  ): void;
}
