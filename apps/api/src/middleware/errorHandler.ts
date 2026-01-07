import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    errors?: any[];
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(err.errors && { errors: err.errors }),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

export class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;
    errors?: any[];

    constructor(
        message: string,
        statusCode: number = 500,
        errors?: any[]
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string = 'Bad Request', errors?: any[]) {
        return new ApiError(message, 400, errors);
    }

    static unauthorized(message: string = 'Unauthorized') {
        return new ApiError(message, 401);
    }

    static forbidden(message: string = 'Forbidden') {
        return new ApiError(message, 403);
    }

    static notFound(message: string = 'Not Found') {
        return new ApiError(message, 404);
    }

    static conflict(message: string = 'Conflict') {
        return new ApiError(message, 409);
    }

    static internal(message: string = 'Internal Server Error') {
        return new ApiError(message, 500);
    }
}
