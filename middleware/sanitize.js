/**
 * sanitize.js — Middleware to strip HTML/script tags from string fields in req.body
 * Usage: router.post('/route', sanitizeBody, handler)
 */

const HTML_TAG_RE = /<[^>]*>/g;

/**
 * Recursively sanitize a value:
 * - Strings: strip HTML tags, trim whitespace
 * - Arrays: sanitize each element
 * - Objects: sanitize each property
 */
function sanitizeValue(val) {
    if (typeof val === 'string') {
        return val.replace(HTML_TAG_RE, '').trim();
    }
    if (Array.isArray(val)) {
        return val.map(sanitizeValue);
    }
    if (val !== null && typeof val === 'object') {
        const cleaned = {};
        for (const key of Object.keys(val)) {
            cleaned[key] = sanitizeValue(val[key]);
        }
        return cleaned;
    }
    return val; // numbers, booleans, null — leave as-is
}

/**
 * Express middleware: sanitizes all string values in req.body in-place.
 */
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    next();
}

module.exports = { sanitizeBody };
