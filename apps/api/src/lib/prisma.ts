import { PrismaClient, Prisma } from '@prisma/client';

// Enhanced Prisma client with logging and connection handling
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const logLevels: Prisma.LogLevel[] =
    process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'];

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: logLevels.map(level => ({
        emit: 'event' as const,
        level,
    })),
});

// Log query performance in development
if (process.env.NODE_ENV === 'development') {
    (prisma as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 1000) {
            console.warn(`[SLOW QUERY] ${e.duration}ms:`, e.query);
        }
    });
}

// Log errors
(prisma as any).$on('error', (e: Prisma.LogEvent) => {
    console.error('[PRISMA ERROR]:', e.message);
});

// Warn on slow queries
(prisma as any).$on('warn', (e: Prisma.LogEvent) => {
    console.warn('[PRISMA WARN]:', e.message);
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown
const shutdown = async () => {
    console.log('Disconnecting from database...');
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Database health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
};

// Transaction helper
export const transaction = async <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number }
): Promise<T> => {
    return prisma.$transaction(fn, {
        maxWait: options?.maxWait ?? 5000,
        timeout: options?.timeout ?? 10000,
    });
};
