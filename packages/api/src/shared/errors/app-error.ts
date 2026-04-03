export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Không tìm thấy tài nguyên") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Bạn không có quyền thực hiện hành động này") {
    super(message, 403, "FORBIDDEN");
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Yêu cầu không hợp lệ") {
    super(message, 400, "BAD_REQUEST");
  }
}

export class ValidationError extends AppError {
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(message: string, details?: Array<{ field: string; message: string }>) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại") {
    super(message, 401, "UNAUTHORIZED");
  }
}
