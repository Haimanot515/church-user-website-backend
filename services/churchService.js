const prisma = require("../prisma/prisma.service");

/* ------------------------------ helpers ------------------------------ */

// "true" / "on" / "1" / true -> true, "false" / "off" / "0" / false -> false,
// undefined / null / "" / "null" / "undefined" -> undefined (not provided)
const toBool = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["", "null", "undefined"].includes(s)) return undefined;
  return ["true", "on", "1"].includes(s);
};

// Text fields: skip undefined, null and the literal "null"/"undefined" strings
// that some form clients send. Empty string is kept (lets users clear a field).
const isProvided = (v) =>
  v !== undefined && v !== null && !["null", "undefined"].includes(v);

const langInclude = { language: { select: { name: true, code: true } } };

/* ------------------------------ language check ----------------------- */

// Throws a clear 400 if the value isn't the id of an existing Language row.
// Call this BEFORE any side effects (like unsetting the primary church).
exports.assertLanguageExists = async (languageId) => {
  if (typeof languageId !== "string" || !languageId.trim()) {
    throw Object.assign(new Error("language is required"), { statusCode: 400 });
  }
  const lang = await prisma.language.findUnique({
    where: { id: languageId },
    select: { id: true },
  });
  if (!lang) {
    throw Object.assign(
      new Error(
        `Language ${JSON.stringify(languageId)} does not exist. Send the language id (UUID), not its code or name.`
      ),
      { statusCode: 400 }
    );
  }
};

/* ------------------------------ primary flag ------------------------- */

// Scoped PER LANGUAGE. Optionally excludes one church (the one being set primary).
exports.unsetPrimaryForLanguage = async (languageId, excludeId = null) => {
  return prisma.church.updateMany({
    where: {
      languageId,
      isPrimary: true,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    data: { isPrimary: false },
  });
};

/* ------------------------------ create ------------------------------- */

exports.createChurch = async ({
  churchName,
  description,
  shortDescription,
  history,
  image,
  address,
  serviceDays,
  serviceTime,
  language,
  isFeatured,
  isPrimary,
}) => {
  const featured = toBool(isFeatured);
  const primary = toBool(isPrimary);

  return prisma.church.create({
    data: {
      churchName,
      description,
      ...(isProvided(shortDescription) && { shortDescription }),
      ...(isProvided(history) && { history }),
      image,
      ...(isProvided(address) && { address }),
      ...(isProvided(serviceDays) && { serviceDays }),
      ...(isProvided(serviceTime) && { serviceTime }),
      languageId: language,
      ...(featured !== undefined && { isFeatured: featured }),
      ...(primary !== undefined && { isPrimary: primary }),
    },
  });
};

/* ------------------------------ queries ------------------------------ */

exports.getChurches = async (languageId) => {
  return prisma.church.findMany({
    where: { languageId },
    include: langInclude,
    orderBy: { createdAt: "desc" },
  });
};

exports.getChurchById = async (id) => {
  return prisma.church.findUnique({ where: { id }, include: langInclude });
};

exports.getPrimaryChurch = async (languageId) => {
  return prisma.church.findFirst({
    where: { isPrimary: true, languageId },
    include: langInclude,
  });
};

// Used by controller before deciding update's languageId fallback
exports.findById = async (id) => {
  return prisma.church.findUnique({ where: { id } });
};

/* ------------------------------ update ------------------------------- */

exports.updateChurch = async (id, updateData) => {
  const data = {};

  // Explicit whitelist of editable text fields
  [
    "churchName",
    "description",
    "shortDescription",
    "history",
    "address",
    "serviceDays",
    "serviceTime",
  ].forEach((f) => {
    if (isProvided(updateData[f])) data[f] = updateData[f];
  });

  if (isProvided(updateData.language) && updateData.language !== "") {
    data.languageId = updateData.language;
  }

  const featured = toBool(updateData.isFeatured);
  if (featured !== undefined) data.isFeatured = featured;

  const primary = toBool(updateData.isPrimary);
  if (primary !== undefined) data.isPrimary = primary;

  if (updateData.image) data.image = updateData.image;

  try {
    return await prisma.church.update({ where: { id }, data, include: langInclude });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    throw err;
  }
};

/* ------------------------------ delete ------------------------------- */

exports.deleteChurch = async (id) => {
  try {
    return await prisma.church.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    if (err.code === "P2003") {
      // ChurchAssignment rows still reference this church
      throw Object.assign(
        new Error("Cannot delete this church while it has assignments. Remove them first."),
        { statusCode: 409 }
      );
    }
    throw err;
  }
};