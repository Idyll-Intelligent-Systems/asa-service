const { RateLimiterMemory } = require('rate-limiter-flexible');
const config = require('../config');

// Rate limiting configuration
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: config.rateLimit.maxRequests,
  duration: config.rateLimit.windowMs
});

// CORS middleware
const corsMiddleware = (req, res, next) => {
  const { origin } = req.headers;
  const allowedOrigins = config.cors.origins;

  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', config.cors.methods.join(', '));
  res.header('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Credentials', config.cors.credentials.toString());

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

// Rate limiting middleware
const rateLimitMiddleware = async(req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, ip } = req;
    const { statusCode } = res;
    
    if (config.server.environment === 'development') {
      console.log(`${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`);
    }
  });
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (config.server.environment === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

module.exports = {
  corsMiddleware,
  rateLimitMiddleware,
  requestLogger,
  securityHeaders
};
