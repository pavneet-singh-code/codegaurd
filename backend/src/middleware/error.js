const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.path}`));

// Central error handler: every failure leaves the API in the same { error: { code, message } } shape.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let status = 500; let code = 'INTERNAL_ERROR'; let message = 'Something went wrong on the server';
  let details;

  if (err instanceof ApiError) ({ status, code, message, details } = err);
  else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? `File exceeds the ${Math.round(env.maxFileSizeBytes / 1024)} KB limit` : 'Invalid upload';
  } else if (err.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Request body is not valid JSON'; }
  else if (err.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large'; }
  else if (err.name === 'ValidationError') { status = 422; code = 'VALIDATION_ERROR'; message = 'Invalid data'; }
  else if (err.name === 'CastError') { status = 400; code = 'BAD_REQUEST'; message = 'Invalid identifier'; }
  else if (err.code === 11000) { status = 409; code = 'DUPLICATE'; message = 'A record with these values already exists'; }

  if (status === 500 && env.nodeEnv !== 'test') console.error(err); // stack stays in the server log only
  const body = { error: { code, message } };
  if (details) body.error.details = details;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
