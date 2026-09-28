const prisma = require("../prisma/prisma.service");

/* ------------------------------ helpers ------------------------------ */

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const toBool = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["", "null", "undefined"].includes(s)) return undefined;
  return ["true", "on", "1"].includes(s);
};

// Skip undefined, null, "", and the literal "null"/"undefined" strings
const isProvided = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && ["", "null", "undefined"].includes(v.trim()));

// "" / null -> null (clears the date), invalid -> 400, valid -> Date
const toDateOrNull = (v) => {
  if (v === null || v === "" || v === "null") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw httpError(`Invalid date: "${v}"`);
  return d;
};

// SECURITY: never `include: { user: true }`, that returns every column
// (including the password hash) to the client.
// Adjust these fields to match what your User model actually has.
const userSelect = { id: true, name: true, email: true };

const relations = { church: true, user: { select: userSelect } };

/* ------------------------------ flags -------------------------------- */

// Scoped per user.
exports.unsetCurrentForUser = async (userId, excludeId = null) => {
  // Prisma treats `userId: undefined` as "no filter" (would hit every user)
  if (!userId) throw httpError("user is required");

  return prisma.churchAssignment.updateMany({
    where: {
      userId,
      isCurrent: true,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    data: { isCurrent: false },
  });
};

// Global scope, NOT per user.
exports.unsetPrimaryGlobally = async (excludeId = null) => {
  return prisma.churchAssignment.updateMany({
    where: {
      isPrimary: true,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    data: { isPrimary: false },
  });
};

/* ------------------------------ create ------------------------------- */

exports.createAssignment = async ({
  user,
  church,
  role,
  servingSince,
  description,
  image,
  isCurrent,
  isPrimary,
}) => {
  if (!isProvided(user)) throw httpError("user is required");
  if (!isProvided(church)) throw httpError("church is required");

  const current = toBool(isCurrent);
  const primary = toBool(isPrimary);

  return prisma.churchAssignment.create({
    data: {
      userId: user,
      churchId: church,
      ...(isProvided(role) && { role }),
      ...(servingSince !== undefined && { servingSince: toDateOrNull(servingSince) }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(current !== undefined && { isCurrent: current }),
      ...(primary !== undefined && { isPrimary: primary }),
    },
    include: relations,
  });
};

/* ------------------------------ read --------------------------------- */

// Lets the controller read an assignment's user before unsetting flags
exports.findById = async (id) => {
  return prisma.churchAssignment.findUnique({ where: { id } });
};

exports.getCurrentChurchForUser = async (userId) => {
  return prisma.churchAssignment.findFirst({
    where: { userId, isCurrent: true },
    include: relations,
  });
};

exports.getLeadershipAssignment = async () => {
  return prisma.churchAssignment.findFirst({
    where: { isCurrent: true, isPrimary: true },
    include: relations,
  });
};

exports.getAllAssignments = async () => {
  return prisma.churchAssignment.findMany({ include: relations });
};

/* ------------------------------ update ------------------------------- */

exports.updateAssignment = async (id, updates) => {
  const data = {};

  ["role", "description"].forEach((f) => {
    if (isProvided(updates[f])) data[f] = updates[f];
  });

  if (updates.servingSince !== undefined) {
    data.servingSince = toDateOrNull(updates.servingSince);
  }
  if (isProvided(updates.user)) data.userId = updates.user;
  if (isProvided(updates.church)) data.churchId = updates.church;

  const current = toBool(updates.isCurrent);
  if (current !== undefined) data.isCurrent = current;

  const primary = toBool(updates.isPrimary);
  if (primary !== undefined) data.isPrimary = primary;

  if (updates.image !== undefined) data.image = updates.image;

  try {
    return await prisma.churchAssignment.update({
      where: { id },
      data,
      include: relations,
    });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    throw err;
  }
};

/* ------------------------------ delete ------------------------------- */

exports.deleteAssignment = async (id) => {
  try {
    return await prisma.churchAssignment.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    throw err;
  }
};