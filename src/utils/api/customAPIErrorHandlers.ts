import { NextRequest } from 'next/server';
import { Session } from '@shopify/shopify-api';
import { SessionNotFoundError } from '@/utils/storage';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type ApiHandler = (
  req: NextRequest,
  context?: any
) => Promise<Response>;

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

export function withErrorHandler(handler: ApiHandler) {
  return async (req: NextRequest, context?: any): Promise<Response> => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);

      let statusCode = 500;
      const errorResponse: ErrorResponse = {
        error: 'Internal server error'
      };

      // Handle specific error types
      if (error instanceof SessionNotFoundError) {
        statusCode = 401;
        errorResponse.error = 'Authentication required';
        errorResponse.code = 'UNAUTHORIZED';
      }
      else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        statusCode = 400;
        errorResponse.code = error.code;
        errorResponse.error = 'Database operation failed';
        errorResponse.details = error.meta;
      }
      else if (error instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        errorResponse.error = 'Invalid data provided';
        errorResponse.code = 'VALIDATION_ERROR';
      }
      else if (error instanceof Error) {
        // Handle standard Error objects
        errorResponse.error = error.message;
        
        // Map common error messages to status codes
        if (error.message.includes('not found')) {
          statusCode = 404;
          errorResponse.code = 'NOT_FOUND';
        }
        else if (error.message.includes('unauthorized') || 
                 error.message.includes('invalid token')) {
          statusCode = 401;
          errorResponse.code = 'UNAUTHORIZED';
        }
        else if (error.message.includes('forbidden')) {
          statusCode = 403;
          errorResponse.code = 'FORBIDDEN';
        }
        else if (error.message.includes('invalid') || 
                 error.message.includes('required')) {
          statusCode = 400;
          errorResponse.code = 'BAD_REQUEST';
        }
      }

      // Add request information in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = {
          ...(errorResponse.details || {}),
          path: req.nextUrl.pathname,
          method: req.method,
        };
      }

      return Response.json(errorResponse, { 
        status: statusCode,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  };
}

// Custom error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export function handleShopifyInitError(error: any): Response {
  const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';

  if (errorMessage.includes('Unable to validate Shopify connection') || errorMessage === 'Missing credentials') {
    return new Response(JSON.stringify({
      error: 'Shopify authentication failed',
      details: errorMessage,
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    error: 'Failed to initialize Shopify connection',
    details: errorMessage,
  }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}



