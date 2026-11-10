const http = require('http');
const config = require('../config/env');
const logger = require('./logger');

/**
 * Validate JWT token with Backend (tifa-be /auth/validate)
 * @param {string} token - JWT token string
 * @returns {Promise<{ valid: boolean, user?: object, error?: string }>}
 */
function validateToken(token) {
  return new Promise((resolve) => {
    if (!token) {
      return resolve({ valid: false, error: 'Token missing' });
    }

    const payload = JSON.stringify({ token });
    const url = new URL('/auth/validate', config.BE_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 8080,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            return resolve(parsed);
          } else {
            logger.warn(`[AuthClient] Token validation returned HTTP ${res.statusCode}`);
            return resolve({ valid: false, error: `Backend returned ${res.statusCode}` });
          }
        } catch (e) {
          logger.error('[AuthClient] Failed to parse backend validation response:', e.message);
          return resolve({ valid: false, error: 'Invalid backend response' });
        }
      });
    });

    req.on('error', (err) => {
      logger.error('[AuthClient] Error contacting backend for token validation:', err.message);
      return resolve({ valid: false, error: 'Backend unreachable' });
    });

    req.on('timeout', () => {
      req.destroy();
      logger.error('[AuthClient] Backend validation request timed out');
      return resolve({ valid: false, error: 'Validation timeout' });
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  validateToken
};
