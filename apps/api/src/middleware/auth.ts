import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ApiError } from './errorHandler.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        organizationId: string;
        branchId?: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('กรุณาเข้าสู่ระบบ');
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw ApiError.internal('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, secret) as {
            id: string;
            email: string;
            role: string;
            organizationId: string;
            branchId?: string;
        };

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                role: true,
                organizationId: true,
                branchId: true,
                isActive: true
            }
        });

        if (!user || !user.isActive) {
            throw ApiError.unauthorized('บัญชีผู้ใช้ไม่ถูกต้องหรือถูกระงับ');
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            branchId: user.branchId || undefined
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(ApiError.unauthorized('Token ไม่ถูกต้อง'));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(ApiError.unauthorized('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่'));
        } else {
            next(error);
        }
    }
};

// Role-based access control
export const authorize = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(ApiError.unauthorized('กรุณาเข้าสู่ระบบ'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(ApiError.forbidden('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'));
        }

        next();
    };
};

// Check if user has access to specific branch
export const checkBranchAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const branchId = req.params.branchId || req.body.branchId;

    if (!branchId) {
        return next();
    }

    if (!req.user) {
        return next(ApiError.unauthorized('กรุณาเข้าสู่ระบบ'));
    }

    // CEO can access all branches
    if (req.user.role === 'CEO') {
        return next();
    }

    // Other users can only access their assigned branch
    if (req.user.branchId && req.user.branchId !== branchId) {
        return next(ApiError.forbidden('คุณไม่มีสิทธิ์เข้าถึงสาขานี้'));
    }

    next();
};
