const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('Invalid or expired token');
  req.user = user;
  next();
});

// Role check. Ownership checks (does THIS professor own THIS assignment?) live in the controllers.
const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(ApiError.forbidden(`This action requires role: ${roles.join(' or ')}`));

module.exports = { authenticate, requireRole };
