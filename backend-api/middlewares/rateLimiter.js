const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // limit each IP to 100 requests per windowMs (covers multiple conversion retries)
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again in an hour.'
  },
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Disable older X-RateLimit headers
});

const heavyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // limit CPU-heavy routes to 10 requests per windowMs
  message: {
    success: false,
    error: 'Heavy conversion limit reached. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  limiter,
  heavyLimiter
};
