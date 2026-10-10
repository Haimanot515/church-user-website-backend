process.env.NODE_ENV = "test";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";

const path = require("path");
const { createMemoryDb } = require("./memoryDb");

const mem = createMemoryDb();

const stubModule = (relPath, exports) => {
  const full = require.resolve(path.join(__dirname, "..", "..", relPath));
  require.cache[full] = { id: full, filename: full, loaded: true, exports };
};

stubModule("prisma/prisma.service.js", {
  ...mem.prisma,
  homeHero: { findFirst: async () => null },
});
stubModule("config/mailer.js", { sendEmail: async () => {} });

const makeRes = () => {
  const listeners = {};
  const res = { statusCode: 200, body: undefined, headers: {}, locals: {} };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.set = (k, v) => {
    res.headers[k] = v;
    return res;
  };
  res.on = (event, fn) => {
    (listeners[event] = listeners[event] || []).push(fn);
    return res;
  };
  res.json = (body) => {
    res.body = body;
    (listeners.finish || []).forEach((fn) => fn());
    return res;
  };
  return res;
};

const makeReq = (overrides = {}) => ({
  headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36" },
  body: {},
  params: {},
  query: {},
  method: "POST",
  ip: "203.0.113.5",
  originalUrl: "/api/test",
  baseUrl: "/api/test",
  route: { path: "/" },
  ...overrides,
});

const flush = () => new Promise((resolve) => setImmediate(resolve));

module.exports = { ...mem, mem, makeReq, makeRes, flush, stubModule };
