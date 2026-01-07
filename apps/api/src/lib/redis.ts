import Redis from 'ioredis';

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
};

// Create Redis client
let redis: Redis | null = null;

export const getRedis = (): Redis | null => {
    if (!redis) {
        try {
            redis = new Redis(redisConfig);

            redis.on('connect', () => {
                console.log('✅ Redis connected');
            });

            redis.on('error', (error) => {
                console.error('❌ Redis error:', error.message);
            });

            redis.on('close', () => {
                console.log('Redis connection closed');
            });
        } catch (error) {
            console.warn('Redis not available, caching disabled');
            return null;
        }
    }
    return redis;
};

// Cache helper functions
export const cache = {
    // Get cached value
    async get<T>(key: string): Promise<T | null> {
        const client = getRedis();
        if (!client) return null;

        try {
            const value = await client.get(key);
            return value ? JSON.parse(value) : null;
        } catch {
            return null;
        }
    },

    // Set cached value with TTL (seconds)
    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        const client = getRedis();
        if (!client) return;

        try {
            await client.setex(key, ttlSeconds, JSON.stringify(value));
        } catch {
            // Ignore cache errors
        }
    },

    // Delete cached value
    async del(key: string): Promise<void> {
        const client = getRedis();
        if (!client) return;

        try {
            await client.del(key);
        } catch {
            // Ignore
        }
    },

    // Delete by pattern (e.g., 'products:*')
    async delPattern(pattern: string): Promise<void> {
        const client = getRedis();
        if (!client) return;

        try {
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(...keys);
            }
        } catch {
            // Ignore
        }
    },

    // Get or set with callback
    async getOrSet<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttlSeconds: number = 300
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) return cached;

        const value = await fetchFn();
        await this.set(key, value, ttlSeconds);
        return value;
    },
};

// Session store for rate limiting
export const sessionStore = {
    async incrementLoginAttempts(ip: string): Promise<number> {
        const client = getRedis();
        if (!client) return 0;

        const key = `login_attempts:${ip}`;
        const attempts = await client.incr(key);
        await client.expire(key, 900); // 15 minutes
        return attempts;
    },

    async clearLoginAttempts(ip: string): Promise<void> {
        const client = getRedis();
        if (!client) return;

        await client.del(`login_attempts:${ip}`);
    },

    async getLoginAttempts(ip: string): Promise<number> {
        const client = getRedis();
        if (!client) return 0;

        const attempts = await client.get(`login_attempts:${ip}`);
        return attempts ? parseInt(attempts) : 0;
    },
};

// Export for graceful shutdown
export const closeRedis = async () => {
    if (redis) {
        await redis.quit();
    }
};
