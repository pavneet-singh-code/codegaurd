const fs = require('fs');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

async function main() {
  if (!env.jwtSecret || env.jwtSecret.length < 16) {
    console.error('JWT_SECRET must be set in .env and be at least 16 characters long.');
    process.exit(1);
  }
  fs.mkdirSync(env.uploadDir, { recursive: true });
  await connectDB();
  console.log(`MongoDB connected`);
  app.listen(env.port, () => console.log(`CodeGuard API listening on http://localhost:${env.port}`));
}
main().catch((err) => { console.error('Failed to start:', err.message); process.exit(1); });
