'use strict';

/**
 * 404 handler for unknown /api routes.
 * Mount after all API route definitions so it only fires when nothing matched.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Not found' });
}

/**
 * Global Express error handler.
 * Returns JSON { message } for every unhandled error.
 * Unexpected errors (5xx) use a generic message so internals never leak.
 * The real error is always logged server-side.
 */
function errorHandler(err, req, res, _next) {
  console.error(err);
  const status =
    typeof err.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

  // For server errors, never send the original message (it may contain internal details).
  const message = status >= 500 ? 'Internal server error' : err.message || 'Error';

  res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };
