const rateLimitStore = new Map();

class RateLimitMiddleware {
    static createRateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        return (req, res, next) => {
            const key = req.ip + req.route.path;
            const now = Date.now();

            if (!rateLimitStore.has(key)) {
                rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
                return next();
            }

            const record = rateLimitStore.get(key);

            if (now > record.resetTime) {
                record.count = 1;
                record.resetTime = now + windowMs;
                return next();
            }

            if (record.count >= maxAttempts) {
                return res.status(429).json({
                    success: false,
                    error: 'Too many attempts. Please try again later.',
                    retryAfter: Math.ceil((record.resetTime - now) / 1000)
                });
            }

            record.count++;
            next();
        };
    }
}

module.exports = RateLimitMiddleware;