class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(msg, code = 'BAD_REQUEST') { return new ApiError(400, code, msg); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, 'UNAUTHENTICATED', msg); }
  static forbidden(msg = 'You do not have permission to do that') { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, 'NOT_FOUND', msg); }
  static conflict(msg, code = 'CONFLICT') { return new ApiError(409, code, msg); }
}
module.exports = ApiError;
