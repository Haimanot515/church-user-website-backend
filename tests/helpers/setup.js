// Test harness: loads the real Express app with a stubbed database and mailer,
// so tests run without Postgres, Brevo or Cloudinary.
process.env.NODE_ENV = "test";
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/test";
process.env.BREVO_API_KEY = "test";
process.env.EMAIL_FROM = "test@example.com";
process.env.CLOUDINARY_CLOUD_NAME = "x";
process.env.CLOUDINARY_API_KEY = "x";
process.env.CLOUDINARY_API_SECRET = "x";
process.env.BACKEND_URL = "http://localhost:5000";

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { createMemoryDb } = require("./memoryDb");
const path = require("path");
const Module = require("module");

// The generated Prisma client may not exist in CI/sandboxes; tests never touch real enums.
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "@prisma/client") {
    return {
      FaqCategory: {},
      MissionVisionType: {},
      ServiceCategory: {},
      ServiceStatus: {},
      PrismaClient: class {},
    };
  }
  return originalLoad.call(this, request, ...rest);
};

const calls = [];
const emails = [];

const memory = createMemoryDb();

const db = {
  users: memory.db.users,
  sessions: memory.db.sessions,
  auditLogs: memory.db.auditLogs,
  codes: [],
  subscribers: [],
  posts: new Map(),
  media: new Map(),
};

const stubModule = (relPath, exports) => {
  const full = require.resolve(path.join(__dirname, "..", "..", relPath));
  require.cache[full] = { id: full, filename: full, loaded: true, exports };
};

const record = (name, impl) => async (args) => {
  calls.push({ name, args });
  return impl ? impl(args) : null;
};

const prismaStub = {
  user: { ...memory.prisma.user, update: record("user.update", memory.prisma.user.update) },
  role: memory.prisma.role,
  permission: memory.prisma.permission,
  rolePermission: memory.prisma.rolePermission,
  session: memory.prisma.session,
  auditLog: memory.prisma.auditLog,
  language: {
    findUnique: record("language.findUnique", ({ where }) => ({
      id: `lang-${where.code}`,
      code: where.code,
    })),
  },
  post: {
    findUnique: record("post.findUnique", ({ where }) => db.posts.get(where.id) || null),
  },
  media: {
    findUnique: record("media.findUnique", ({ where }) => db.media.get(where.id) || null),
    findMany: record("media.findMany", ({ where }) =>
      [...db.media.values()].filter((m) => !where || !where.status || m.status === where.status)
    ),
  },
  homeHero: { findFirst: record("homeHero.findFirst", () => null) },
  verificationCode: {
    deleteMany: record("vc.deleteMany", () => {
      db.codes.length = 0;
      return { count: 1 };
    }),
    create: record("vc.create", ({ data }) => {
      const c = { id: `c${db.codes.length + 1}`, createdAt: new Date(), ...data };
      db.codes.push(c);
      return c;
    }),
    findFirst: record(
      "vc.findFirst",
      ({ where }) => db.codes.filter((c) => c.email === where.email && !c.used).pop() || null
    ),
    update: record("vc.update", ({ where, data }) => {
      const c = db.codes.find((x) => x.id === where.id);
      if (data.attempts && data.attempts.increment) c.attempts += data.attempts.increment;
      return c;
    }),
    updateMany: record("vc.updateMany", ({ where, data }) => {
      const c = db.codes.find((x) => x.id === where.id && x.used === where.used);
      if (!c) return { count: 0 };
      Object.assign(c, data);
      return { count: 1 };
    }),
  },
  thread: {
    findFirst: record("thread.findFirst", ({ where }) => ({
      id: "t1",
      userEmail: where.userEmail,
    })),
    create: record("thread.create", ({ data }) => ({ id: "t1", ...data })),
    update: record("thread.update", ({ where }) => ({ id: where.id })),
    findMany: record("thread.findMany", () => []),
  },
  message: {
    create: record("message.create", () => ({ id: "m1" })),
    findMany: record("message.findMany", () => []),
  },
  subscriber: {
    findFirst: record(
      "subscriber.findFirst",
      ({ where }) => db.subscribers.find((s) => s.email === where.email) || null
    ),
    create: record("subscriber.create", ({ data }) => {
      const s = { id: `s${db.subscribers.length + 1}`, ...data };
      db.subscribers.push(s);
      return s;
    }),
    update: record("subscriber.update", ({ where, data }) => {
      const s = db.subscribers.find((x) => x.id === where.id);
      Object.assign(s, data);
      return s;
    }),
    findMany: record("subscriber.findMany", () => db.subscribers.filter((s) => s.active)),
  },
  $queryRaw: async () => [{ "?column?": 1 }],
  $disconnect: async () => {},
  connect: async () => {},
};

stubModule("prisma/prisma.service.js", prismaStub);
stubModule("config/mailer.js", {
  sendEmail: async (to, subject, html) => {
    emails.push({ to, subject, html });
  },
});

const app = require("../../app");

const addUser = (overrides = {}) => memory.addUser(overrides);

const tokenFor = (user, extra = {}) => {
  const session = memory.addSession(user);
  return jwt.sign(
    { id: user.id, sid: session.id, tv: user.tokenVersion, ...extra },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "1h" }
  );
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

module.exports = { app, db, calls, emails, addUser, tokenFor, flush, crypto };
