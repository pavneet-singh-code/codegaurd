const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploader } = require('../middleware/upload');
const auth = require('../controllers/authController');
const assignments = require('../controllers/assignmentController');
const submissions = require('../controllers/submissionController');
const analyses = require('../controllers/analysisController');
const stats = require('../controllers/statsController');

const router = express.Router();
const PROF = requireRole('PROFESSOR');
const STUDENT = requireRole('STUDENT');
const idParam = (name = 'id') => param(name).isMongoId().withMessage('Invalid id');
const upload = (req, res, next) => uploader()(req, res, next); // built per request so env changes apply

// ---------- validation chains ----------
const isoDate = (field, { required = true } = {}) => {
  const c = body(field);
  return (required ? c : c.optional()).isISO8601().withMessage(`${field} must be an ISO date`).toDate();
};
const assignmentRules = (partial) => {
  const opt = (c) => (partial ? c.optional() : c);
  return [
    opt(body('title').isString().trim().isLength({ min: 3, max: 150 })).withMessage('title must be 3-150 characters'),
    body('description').optional().isString().trim().isLength({ max: 5000 }),
    opt(body('programmingLanguage').isIn(['java', 'python'])).withMessage('programmingLanguage must be java or python'),
    isoDate('deadline', { required: !partial }),
    body('allowLateSubmissions').optional().isBoolean().toBoolean(),
  ];
};
const registerRules = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters'),
  body('email').isString().trim().isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('password').isString().isLength({ min: 8, max: 72 }).withMessage('password must be 8-72 characters'),
  body('role').isIn(['PROFESSOR', 'STUDENT']).withMessage('role must be PROFESSOR or STUDENT'),
  body('inviteCode').optional().isString(),
];
const loginRules = [
  body('email').isString().trim().isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('password').isString().notEmpty().withMessage('password is required'),
];
const analyzeRules = [
  idParam(),
  body('threshold').optional().isFloat({ min: 0, max: 1 }).withMessage('threshold must be between 0 and 1').toFloat(),
  body('kgramSize').optional().isInt({ min: 2, max: 20 }).toInt(),
  body('windowSize').optional().isInt({ min: 1, max: 20 }).toInt(),
];

// ---------- auth ----------
router.post('/auth/register', registerRules, validate, auth.register);
router.post('/auth/login', loginRules, validate, auth.login);
router.get('/auth/me', authenticate, auth.me);
router.patch('/auth/me', authenticate, [body('name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters')], validate, auth.updateMe);
router.post('/auth/change-password', authenticate, [
  body('currentPassword').isString().notEmpty().withMessage('currentPassword is required'),
  body('newPassword').isString().isLength({ min: 8, max: 72 }).withMessage('newPassword must be 8-72 characters'),
], validate, auth.changePassword);

// ---------- dashboard statistics ----------
router.get('/stats/professor', authenticate, PROF, stats.professor);
router.get('/stats/student', authenticate, STUDENT, stats.student);

// ---------- assignments ----------
router.post('/assignments', authenticate, PROF, assignmentRules(false), validate, assignments.create);
router.get('/assignments', authenticate, [query('status').optional().isString()], validate, assignments.list);
router.get('/assignments/:id', authenticate, idParam(), validate, assignments.get);
router.put('/assignments/:id', authenticate, PROF, idParam(), assignmentRules(true), validate, assignments.update);
router.patch('/assignments/:id/close', authenticate, PROF, idParam(), validate, assignments.close);

// ---------- submissions ----------
router.post('/assignments/:id/submissions', authenticate, STUDENT, idParam(), validate, assignments.loadAssignment,
  submissions.ensureAcceptingSubmissions, upload, submissions.create);
router.get('/assignments/:id/submissions', authenticate, idParam(), validate, assignments.loadAssignment, submissions.listForAssignment);
router.get('/submissions/mine', authenticate, STUDENT, submissions.listMine); // must stay above /submissions/:id
router.get('/submissions/:id', authenticate, idParam(), validate, submissions.get);
router.get('/submissions/:id/versions', authenticate, idParam(), validate, submissions.versions);

// ---------- analyses ----------
router.post('/assignments/:id/analyze', authenticate, PROF, analyzeRules, validate, analyses.start);
router.get('/assignments/:id/analyses', authenticate, PROF, idParam(), validate, analyses.listForAssignment);
router.get('/analyses', authenticate, PROF, analyses.listRecent);
router.get('/analyses/:id', authenticate, PROF, idParam(), validate, analyses.get);
router.get('/analyses/:id/results', authenticate, PROF, idParam(), validate, analyses.results);
router.get('/analyses/:id/results/:resultId', authenticate, PROF, idParam(), idParam('resultId'), validate, analyses.pairDetail);
router.get('/analyses/:id/report.csv', authenticate, PROF, idParam(), validate, analyses.csv);

module.exports = router;
