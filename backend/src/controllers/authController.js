const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const rounds = () => parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4); // keeps login timing similar for unknown emails

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });

exports.register = asyncHandler(async (req, res) => {
  // Mass-assignment protection: only these fields are ever read from the body.
  const { name, email, password, role, inviteCode } = req.body;
  if (role === 'PROFESSOR' && env.professorInviteCode && inviteCode !== env.professorInviteCode) {
    throw ApiError.forbidden('A valid invite code is required to register as a professor');
  }
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  const user = await User.create({ name, email, role, password: await bcrypt.hash(password, rounds()) });
  res.status(201).json({ token: signToken(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  res.json({ token: signToken(user), user });
});

exports.me = (req, res) => res.json({ user: req.user });

exports.updateMe = asyncHandler(async (req, res) => {
  req.user.name = req.body.name; // only the name can be changed here
  await req.user.save();
  res.json({ user: req.user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  // 400 (not 401) so the frontend does not mistake a typo for an expired session.
  if (!(await bcrypt.compare(currentPassword, user.password))) throw ApiError.badRequest('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  if (currentPassword === newPassword) throw ApiError.badRequest('Choose a password different from the current one', 'PASSWORD_UNCHANGED');
  user.password = await bcrypt.hash(newPassword, rounds());
  await user.save();
  res.json({ message: 'Password updated' });
});
