export const LIMITS = {
  MAX_REPORT_IMAGES: 10,
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SHORT_TEXT: 200,
  MAX_LONG_TEXT: 5000,
  MIN_PASSWORD_LENGTH: 8,
  REPORT_EDIT_DAYS: 7,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  LOGIN_RATE_LIMIT: 5,
  LOGIN_RATE_WINDOW_MS: 60 * 1000,
  API_RATE_LIMIT: 100,
  API_RATE_WINDOW_MS: 60 * 1000,
} as const;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
