import * as xlsx from 'xlsx-color';
import { WorkBook } from 'xlsx-color';
import { Injectable, BadRequestException } from '@nestjs/common';
import { ExcelPort } from '../../shared/interfaces/excel.port';
import { Logger } from '@nestjs/common';

@Injectable()
export class ExcelAdapter implements ExcelPort {
  private readonly logger = new Logger(ExcelAdapter.name);

  readExcel(file: Buffer): WorkBook {
    try {
      return xlsx.read(file, { type: 'buffer' });
    } catch (error) {
      this.logger.error(
        `Error in ExcelAdapter of readExcel: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(
        `The file could not be read: ${JSON.stringify(error)}`,
      );
    }
  }

  validateValuesByColumn<T>(
    rows: T[],
    column: string,
    emptyValues: unknown[] = [null, undefined, ''],
  ): void {
    const invalidRows: { row: number; value: any }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const value = row[column as keyof T];

      if (emptyValues.includes(value)) {
        invalidRows.push({ row: i + 2, value });
      }
    }

    if (invalidRows.length > 0) {
      throw new BadRequestException({
        message: `Excel has empty or null values in column "${column}"`,
        error: 'ERR_EXCEL_EMPTY_OR_NULL_VALUES',
        invalidRows,
      });
    }
  }

  convertSheetExcelToJson<T>(workbook: WorkBook, sheetNumber: number): T[] {
    try {
      return xlsx.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[sheetNumber]],
        {
          raw: false,
          defval: null,
          blankrows: false,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error in ExcelAdapter of convertSheetExcelToJson: ${JSON.stringify(error)}`,
      );
      throw new BadRequestException(
        `The workbook could not be coverted to json: ${JSON.stringify(error)}`,
      );
    }
  }

  validateHeaders(headers: string[], headersReceived: string[]): void {
    if (
      headers.length !== headersReceived.length ||
      !headers.every(
        (header: string, index: number) => header === headersReceived[index],
      )
    ) {
      throw new BadRequestException(
        `Excel has invalid headers. Expected: ${headers.join(', ')}. Received: ${headersReceived.join(', ')}`,
      );
    }
  }

  validateNumberOfRows(rows: unknown[], limit: number): void {
    if (rows.length > limit) {
      throw new BadRequestException(
        `Excel has more than ${limit} rows`,
      );
    }
  }

  validateDuplicatesByColumn<T>(array: T[], field: string): void {
    const values = new Set<unknown>();
    const duplicates: unknown[] = [];

    for (const item of array) {
      const fieldValue = item[field as keyof T];

      if (values.has(fieldValue)) {
        duplicates.push(fieldValue);
      }

      values.add(fieldValue);
    }

    if (duplicates.length) {
      throw new BadRequestException({
        message: `Excel has duplicate rows in ${field} column`,
        duplicates,
      });
    }
  }

  createExcelBuffer<T>(data: T[], hasErrors: boolean = false): Buffer {
    const workbook = xlsx.utils.book_new(),
      worksheet = xlsx.utils.json_to_sheet<T>(data);

    if (hasErrors) {
      const ref = worksheet['!ref'] as string;
      if (ref) {
        const lastColumn = ref.split(':')[1];
        // Basic error highlighting logic if needed, simplified for this implementation
      }
    }

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet 1');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  createCSVBuffer<T>(data: T[]): Buffer {
    const workbook = xlsx.utils.book_new(),
      worksheet = xlsx.utils.json_to_sheet<T>(data);

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet 1');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'csv' });
  }
}
