/**
 * Custom error classes for better error handling
 * These errors can be caught and handled appropriately in API routes
 */

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 401 Unauthorized - User is not authenticated or not authorized to access resource
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, true)
  }
}

/**
 * 403 Forbidden - User doesn't have permission to access this resource
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, true)
  }
}

/**
 * 404 Not Found - Requested resource not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true)
  }
}

/**
 * 400 Bad Request - Invalid input or validation error
 */
export class ValidationError extends AppError {
  public readonly errors?: Array<{ field: string; message: string }>

  constructor(message: string = 'Validation failed', errors?: Array<{ field: string; message: string }>) {
    super(message, 400, true)
    this.errors = errors
  }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true)
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false)
  }
}
