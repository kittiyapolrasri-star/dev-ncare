import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from './auth.js';

// Enhanced audit logging
interface AuditLogData {
    userId?: string;
    organizationId?: string;
    branchId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

// Create audit log entry
export const createAuditLog = async (data: AuditLogData) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                oldData: data.oldData ? JSON.stringify(data.oldData) : null,
                newData: data.newData ? JSON.stringify(data.newData) : null,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

// Audit log middleware for automatic logging
export const auditLog = (action: string, resource: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        const startTime = Date.now();

        // Capture response
        res.send = function (body: any) {
            const responseTime = Date.now() - startTime;

            // Only log successful mutating operations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const logData: AuditLogData = {
                    userId: req.user?.id,
                    organizationId: req.user?.organizationId,
                    branchId: req.user?.branchId || req.body?.branchId,
                    action,
                    resource,
                    resourceId: req.params?.id || (typeof body === 'string' ? JSON.parse(body)?.data?.id : body?.data?.id),
                    ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: {
                        method: req.method,
                        path: req.path,
                        responseTime,
                        statusCode: res.statusCode,
                    },
                };

                // Capture old/new data for updates
                if (req.method === 'PUT' || req.method === 'PATCH') {
                    logData.newData = req.body;
                } else if (req.method === 'POST') {
                    logData.newData = req.body;
                }

                createAuditLog(logData);
            }

            return originalSend.call(this, body);
        };

        next();
    };
};

// Security event types
export type SecurityEvent =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET'
    | 'SESSION_EXPIRED'
    | 'UNAUTHORIZED_ACCESS'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SUSPICIOUS_ACTIVITY';

// Log security events
export const logSecurityEvent = async (
    event: SecurityEvent,
    details: {
        userId?: string;
        email?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, any>;
    }
) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: details.userId,
                action: `SECURITY:${event}`,
                resource: 'AUTH',
                ipAddress: details.ipAddress,
                userAgent: details.userAgent,
                metadata: JSON.stringify({
                    event,
                    email: details.email,
                    timestamp: new Date().toISOString(),
                    ...details.metadata,
                }),
            },
        });

        // Log critical events to console for monitoring
        if (['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'SUSPICIOUS_ACTIVITY'].includes(event)) {
            console.warn(`[SECURITY] ${event}:`, {
                email: details.email,
                ip: details.ipAddress,
                time: new Date().toISOString(),
            });
        }
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
};

// Middleware to log all requests (for debugging/monitoring)
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

        const logData = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
            userAgent: req.headers['user-agent']?.substring(0, 100),
        };

        if (logLevel === 'warn') {
            console.warn(`[REQUEST]`, logData);
        } else if (process.env.NODE_ENV !== 'production' || duration > 1000) {
            console.log(`[REQUEST]`, logData);
        }
    });

    next();
};
