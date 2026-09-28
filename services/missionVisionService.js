const prisma = require("../prisma/prisma.service");
const { MissionVisionType } = require("@prisma/client");

/* ------------------------------ helpers ------------------------------ */

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

// A form field counts as "provided" only if it isn't undefined, null,
// the string "null"/"undefined", or an empty/whitespace string.
const isProvided = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && ["", "null", "undefined"].includes(v.trim()));

// Safe integer parsing: Number("") is 0 and Number("abc") is NaN, both bad.
const toInt = (v, field = "value") => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw httpError(`${field} must be a whole number`);
  return n;
};

const assertType = (type) => {
  if (!Object.values(MissionVisionType).includes(type)) {
    throw httpError(
      `Invalid type: "${type}". Allowed: ${Object.values(MissionVisionType).join(", ")}`
    );
  }
};

/* ------------------------------ queries ------------------------------ */

exports.getMissionVision = async (languageId) => {
  return prisma.missionVision.findMany({
    where: { languageId },
    include: { language: { select: { name: true, code: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }, { id: "desc" }],
  });
};

/* ------------------------------ create ------------------------------- */

exports.createMissionVision = async ({ type, title, desc, order, language }) => {
  assertType(type); // required enum on create

  return prisma.missionVision.create({
    data: {
      type,
      title,
      desc,
      ...(isProvided(order) && { order: toInt(order, "order") }),
      languageId: language,
    },
  });
};

/* ------------------------------ update ------------------------------- */

exports.updateMissionVision = async (id, body) => {
  const data = {};

  // Explicit whitelist of editable text fields
  ["type", "title", "desc"].forEach((f) => {
    if (isProvided(body[f])) data[f] = body[f];
  });

  if (data.type !== undefined) assertType(data.type);

  if (isProvided(body.order)) data.order = toInt(body.order, "order");
  if (isProvided(body.language)) data.languageId = body.language;

  try {
    return await prisma.missionVision.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    throw err;
  }
};

/* ------------------------------ delete ------------------------------- */

exports.deleteMissionVision = async (id) => {
  try {
    return await prisma.missionVision.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    throw err;
  }
};