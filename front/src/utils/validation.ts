// Validation utilities for OMR Scanner

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateStudentCode = (code: string): boolean => {
  return code.trim().length >= 3;
};

export const validateFullName = (name: string): boolean => {
  return name.trim().length >= 3;
};

export const validateImageSize = (sizeInMB: number, maxSizeMB: number = 5): boolean => {
  return sizeInMB <= maxSizeMB;
};

export const validateImageDimensions = (
  width: number,
  height: number,
  minWidth: number = 800,
  minHeight: number = 600
): boolean => {
  return width >= minWidth && height >= minHeight;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatScore = (correct: number, total: number): string => {
  return `${correct}/${total}`;
};
