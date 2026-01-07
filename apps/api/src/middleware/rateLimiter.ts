import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter configurations for different endpoints
const rateLimiters = {
    // General API - 100 requests per minute
    general: new RateLimiterMemory({
        keyPrefix: 'general',
        points: 100,
        duration: 60,
    }),

    // Auth endpoints - stricter limits (10 attempts per 15 minutes)
    auth: new RateLimiterMemory({
        keyPrefix: 'auth',
        points: 10,
        duration: 900, // 15 minutes
        blockDuration: 900, // Block for 15 minutes after exceeding
    }),

    // POS/Sales - higher limits (500 per minute)
    pos: new RateLimiterMemory({
        keyPrefix: 'pos',
        points: 500,
        duration: 60,
    }),

    // Reports - lower limits (30 per minute, as they're heavy)
    reports: new RateLimiterMemory({
        keyPrefix: 'reports',
        points: 30,
        duration: 60,
    }),
};

// Get client IP
const getClientIp = (req: Request): string => {
    return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown'
    );
};

// General rate limiter middleware
export const rateLimiter = (type: 'general' | 'auth' | 'pos' | 'reports' = 'general') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const limiter = rateLimiters[type];
        const clientIp = getClientIp(req);

        try {
            await limiter.consume(clientIp);
            next();
        } catch (rejRes: any) {
            const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;

            res.set('Retry-After', String(retryAfter));
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่',
                    retryAfter,
                },
            });
        }
    };
};

// Slow down middleware for brute force protection
const slowBrute = new RateLimiterMemory({
    keyPrefix: 'slow_brute',
    points: 5, // 5 failed attempts
    duration: 60 * 60, // per 1 hour
    blockDuration: 60 * 15, // block for 15 minutes
});

export const slowDown = async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = getClientIp(req);

    try {
        // Check if already blocked
        const resSlowBrute = await slowBrute.get(clientIp);

        if (resSlowBrute && resSlowBrute.consumedPoints >= 5) {
            const retryMs = resSlowBrute.msBeforeNext || 60000;

            res.status(429).json({
                success: false,
                error: {
                    code: 'TOO_MANY_FAILED_ATTEMPTS',
                    message: 'พยายามเข้าสู่ระบบล้มเหลวหลายครั้ง กรุณารอสักครู่',
                    retryAfter: Math.round(retryMs / 1000),
                },
            });
            return;
        }

        next();
    } catch (err) {
        next(err);
    }
};

export const recordFailedLogin = async (ip: string) => {
    try {
        await slowBrute.consume(ip);
    } catch {
        // Ignore - already blocked
    }
};

export const clearFailedLogins = async (ip: string) => {
    try {
        await slowBrute.delete(ip);
    } catch {
        // Ignore errors
    }
};
