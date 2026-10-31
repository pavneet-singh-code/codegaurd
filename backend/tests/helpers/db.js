const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let server;
exports.connect = async () => {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // make sure unique indexes exist
};
exports.clear = async () => { for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({}); };
exports.close = async () => { await mongoose.disconnect(); if (server) await server.stop(); };
