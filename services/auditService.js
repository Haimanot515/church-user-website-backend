const prisma = require("../prisma/prisma.service");
const { redact } = require("../utils/auditRedaction");
const { parsePagination } = require("../utils/pagination");

const MAX_JSON_CHARS = 8000;
const OUTCOMES = ["success", "failure", "denied"];
const SEVERITIES = ["info", "warning", "critical"];

const clip = (value, max) => (typeof value === "string" && value ? value.slice(0, max) : null);

const jsonOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const safe = redact(value);
  return JSON.stringify(safe).length > MAX_JSON_CHARS ? { truncated: true } : safe;
};

const normalize = (entry) => ({
  actorId: clip(entry.actorId, 100),
  actorEmail: clip(entry.actorEmail, 254),
  actorRole: clip(entry.actorRole, 64),
  action: clip(entry.action, 100) || "unknown",
  outcome: OUTCOMES.includes(entry.outcome) ? entry.outcome : "success",
  severity: SEVERITIES.includes(entry.severity) ? entry.severity : "info",
  entity: clip(entry.entity, 100),
  entityId: clip(
    entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
    100
  ),
  targetUserId: clip(entry.targetUserId, 100),
  diff: jsonOrNull(entry.diff),
  metadata: jsonOrNull(entry.metadata),
  ipAddress: clip(entry.ipAddress, 64),
  userAgent: clip(entry.userAgent, 255),
  sessionId: clip(entry.sessionId, 100),
  requestId: clip(entry.requestId, 64),
});

exports.normalize = normalize;

exports.record = async (entry) => {
  try {
    await prisma.auditLog.create({ data: normalize(entry) });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};

exports.fromRequest = (req) => {
  const user = req.user || {};
  const headers = req.headers || {};
  return {
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    sessionId: user.sessionId,
    ipAddress: req.ip,
    userAgent: headers["user-agent"],
    requestId: req.id,
  };
};

exports.event = (req, action, details = {}) =>
  exports.record({ ...exports.fromRequest(req), action, ...details });

const parseDate = (value) => {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const buildWhere = (query) => {
  const where = {};
  for (const key of [
    "action",
    "actorId",
    "entity",
    "entityId",
    "targetUserId",
    "outcome",
    "severity",
  ]) {
    if (typeof query[key] === "string" && query[key]) where[key] = query[key].slice(0, 100);
  }
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
  return where;
};

exports.list = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 25, maxLimit: 100 });
  const where = buildWhere(query);
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
  ]);
  return { logs, total, page, totalPages: Math.ceil(total / limit) };
};
