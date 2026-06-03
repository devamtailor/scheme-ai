import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

// 1. IP-Based Rate Limiting for search endpoints
// Restricts users to a maximum of 5 requests per minute.
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  limit: 5, // limit each IP to 5 requests per windowMs (v7+)
  max: 5, // backward compatibility for v6
  message: {
    error: 'Too many search requests. Please wait a minute and try again.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { ip: false } // Disable startup validation to prevent localhost IPv6 crashes
});

// 2. Input Validation and Sanitization Rules for /api/analyze
export const validateAnalyzeInput = [
  // Validate chatText (Natural Language Search query) if it exists
  body('chatText')
    .optional()
    .isString()
    .withMessage('Search query must be a string.')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Search query must be between 3 and 100 characters.')
    .escape() // Strips out HTML/special characters to prevent XSS
    .customSanitizer(value => {
      // Remove potentially malicious characters but keep spaces and alphanumeric content
      return value.replace(/[^\w\s\-\.\,\?\!\:\;\(\)\u0900-\u097F]/gi, '');
    }),

  // Validate profile object if it exists
  body('profile')
    .optional()
    .isObject()
    .withMessage('Profile must be a valid object.'),

  body('profile.name')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .escape(),

  body('profile.age')
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 120 })
    .withMessage('Age must be a valid number between 0 and 120.')
    .toInt(),

  body('profile.gender')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  body('profile.state')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  body('profile.city')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  body('profile.income')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage('Income must be a valid non-negative number.')
    .toInt(),

  body('profile.category')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  body('profile.profession')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  body('profile.education')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  body('profile.disability')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  body('profile.minority')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .escape(),

  // Middleware to drop request if validation fails
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return 400 with validation errors array
      return res.status(400).json({
        error: errors.array()[0].msg // Send the first error message to user
      });
    }

    // Verify at least one of chatText or profile was provided
    if (!req.body.chatText && !req.body.profile) {
      return res.status(400).json({
        error: 'Please provide either a search query or a profile form.'
      });
    }

    next();
  }
];
