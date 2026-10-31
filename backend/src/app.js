const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.disable('x-powered-by');
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)), // same-origin/tools or listed origins
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
