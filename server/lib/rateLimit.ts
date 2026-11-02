import type { Request, Response, NextFunction } from 'express';

export function createLimiter(max: number, windowMs: number) {
    const hits = new Map<string, { count: number; resetAt: number }>();
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }, windowMs).unref();

    return {
        blocked(key: string): boolean {
            const entry = hits.get(key);
            return !!entry && entry.resetAt > Date.now() && entry.count >= max;
        },
        hit(key: string): void {
            const now = Date.now();
            const entry = hits.get(key);
            if (!entry || entry.resetAt <= now) hits.set(key, { count: 1, resetAt: now + windowMs });
            else entry.count++;
        },
    };
}

export function rateLimit(max: number, windowMs: number) {
    const limiter = createLimiter(max, windowMs);
    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip ?? 'unknown';
        if (limiter.blocked(key)) { res.status(429).json({ error: 'Too many attempts, try again in a minute' }); return; }
        limiter.hit(key);
        next();
    };
}
