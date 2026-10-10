const crypto = require("crypto");
const prisma = require("../prisma/prisma.service");
const {
  refreshTtlMs,
  sessionMaxAgeMs,
  refreshReuseGraceMs,
  sessionTouchIntervalMs,
} = require("../config/security");
const deviceLabel = require("../utils/deviceLabel");

const TOKEN_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/;

const hashSecret = (secret) => crypto.createHash("sha256").update(secret).digest("hex");
const newSecret = () => crypto.randomBytes(32).toString("base64url");

const sameHash = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const parseToken = (token) => {
  const match = typeof token === "string" && token.length <= 128 ? TOKEN_PATTERN.exec(token) : null;
  return match ? { id: match[1], secret: match[2] } : null;
};

const deviceFields = (device = {}) => ({
  ipAddress: device.ipAddress ? String(device.ipAddress).slice(0, 64) : null,
  userAgent: device.userAgent ? String(device.userAgent).slice(0, 255) : null,
  deviceLabel: deviceLabel(device.userAgent),
});

exports.parseToken = parseToken;
exports.hashSecret = hashSecret;

exports.create = async (userId, device) => {
  const now = new Date();
  const id = crypto.randomUUID();
  const secret = newSecret();
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: now } } });
  const session = await prisma.session.create({
    data: {
      id,
      userId,
      refreshHash: hashSecret(secret),
      expiresAt: new Date(now.getTime() + refreshTtlMs),
      absoluteExpiresAt: new Date(now.getTime() + sessionMaxAgeMs),
      lastActiveAt: now,
      ...deviceFields(device),
    },
  });
  return { session, refreshToken: `${id}.${secret}` };
};

exports.rotate = async (token, device) => {
  const parsed = parseToken(token);
  if (!parsed) return { ok: false, reason: "invalid" };

  const session = await prisma.session.findUnique({ where: { id: parsed.id } });
  if (!session) return { ok: false, reason: "invalid" };

  const presented = hashSecret(parsed.secret);
  const now = new Date();

  if (sameHash(presented, session.refreshHash)) {
    if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
      await prisma.session.deleteMany({ where: { id: session.id } });
      return { ok: false, reason: "expired", userId: session.userId };
    }
    const nextSecret = newSecret();
    const nextExpiry = Math.min(now.getTime() + refreshTtlMs, session.absoluteExpiresAt.getTime());
    const updated = await prisma.session.updateMany({
      where: { id: session.id, refreshHash: session.refreshHash },
      data: {
        refreshHash: hashSecret(nextSecret),
        previousRefreshHash: session.refreshHash,
        rotatedAt: now,
        expiresAt: new Date(nextExpiry),
        lastActiveAt: now,
        ...deviceFields(device),
      },
    });
    if (updated.count !== 1) return { ok: false, reason: "conflict", userId: session.userId };
    return {
      ok: true,
      sessionId: session.id,
      userId: session.userId,
      refreshToken: `${session.id}.${nextSecret}`,
    };
  }

  if (session.previousRefreshHash && sameHash(presented, session.previousRefreshHash)) {
    if (session.rotatedAt && now.getTime() - session.rotatedAt.getTime() <= refreshReuseGraceMs) {
      return { ok: false, reason: "conflict", userId: session.userId };
    }
    const revoked = await exports.revokeAllForUser(session.userId);
    return { ok: false, reason: "reuse", userId: session.userId, sessionId: session.id, revoked };
  }

  return { ok: false, reason: "invalid" };
};

exports.findForAuth = (id) =>
  prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      absoluteExpiresAt: true,
      lastActiveAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          tokenVersion: true,
          accessRole: {
            select: {
              name: true,
              permissions: { select: { permission: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

exports.touch = (session) => {
  const last = session.lastActiveAt ? session.lastActiveAt.getTime() : 0;
  if (Date.now() - last < sessionTouchIntervalMs) return;
  prisma.session
    .updateMany({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
    .catch((err) => console.error("Session touch failed:", err.message));
};

exports.listForUser = (userId) =>
  prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      deviceLabel: true,
      ipAddress: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
    },
  });

exports.revoke = async (userId, sessionId) => {
  const result = await prisma.session.deleteMany({ where: { id: sessionId, userId } });
  return result.count;
};

exports.revokeAllForUser = async (userId, exceptSessionId) => {
  const where = exceptSessionId ? { userId, id: { not: exceptSessionId } } : { userId };
  const result = await prisma.session.deleteMany({ where });
  return result.count;
};

exports.purgeExpired = async () => {
  const now = new Date();
  const result = await prisma.session.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { absoluteExpiresAt: { lt: now } }] },
  });
  return result.count;
};
