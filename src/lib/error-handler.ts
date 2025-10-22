import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string
  message?: string
  details?: unknown
  code?: string
}

/**
 * HTTP status codes for common error scenarios
 */
export const ErrorCodes = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number,
  details?: unknown
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error,
      details,
    },
    { status }
  )
}

/**
 * Handles Prisma database errors and returns appropriate HTTP responses
 */
export function handlePrismaError(error: unknown): NextResponse<ErrorResponse> {
  console.error('Database error:', error)

  // Prisma unique constraint violation
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return createErrorResponse(
        'Bu kayıt zaten mevcut',
        ErrorCodes.CONFLICT,
        'Unique constraint violation'
      )
    }

    if (error.code === 'P2025') {
      return createErrorResponse(
        'Kayıt bulunamadı',
        ErrorCodes.NOT_FOUND,
        'Record not found'
      )
    }

    if (error.code === 'P2003') {
      return createErrorResponse(
        'İlişkili kayıt bulunamadı',
        ErrorCodes.BAD_REQUEST,
        'Foreign key constraint failed'
      )
    }
  }

  // Prisma validation error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return createErrorResponse(
      'Geçersiz veri formatı',
      ErrorCodes.BAD_REQUEST,
      error.message
    )
  }

  // Generic error
  return createErrorResponse(
    'Veritabanı hatası oluştu',
    ErrorCodes.INTERNAL_SERVER_ERROR,
    error instanceof Error ? error.message : 'Unknown error'
  )
}

/**
 * Handles general API errors with proper logging and response
 */
export function handleAPIError(
  error: unknown,
  operation: string
): NextResponse<ErrorResponse> {
  console.error(`${operation} error:`, error)

  // If it's a Prisma error, use the specialized handler
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return handlePrismaError(error)
  }

  // Generic error handling
  return createErrorResponse(
    `${operation} başarısız oldu`,
    ErrorCodes.INTERNAL_SERVER_ERROR,
    error instanceof Error ? error.message : 'Unknown error'
  )
}

/**
 * Creates a success response with consistent format
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * Creates a validation error response
 */
export function createValidationErrorResponse(
  details: unknown
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'Doğrulama hatası',
    ErrorCodes.BAD_REQUEST,
    details
  )
}

/**
 * Creates an unauthorized error response
 */
export function createUnauthorizedResponse(): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'Yetkilendirme gerekli',
    ErrorCodes.UNAUTHORIZED,
    'Authentication required'
  )
}

/**
 * Creates a forbidden error response
 */
export function createForbiddenResponse(
  message: string = 'Bu işlem için yetkiniz yok'
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    message,
    ErrorCodes.FORBIDDEN,
    'Forbidden'
  )
}

/**
 * Creates a not found error response
 */
export function createNotFoundResponse(
  resource: string
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    `${resource} bulunamadı`,
    ErrorCodes.NOT_FOUND
  )
}
