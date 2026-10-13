const prisma = require("../prisma/prisma.service");
const { parseIsoDate, toIsoDate, todayInAddis, toEthiopian } = require("../utils/ethiopianDate");

const STATUSES = ["DRAFT", "PUBLISHED"];
const LIMITS = { verse: 200, body: 5000, meaning: 5000 };
const MAX_IMPORT = 400;
const LANGUAGE_SELECT = { select: { name: true, code: true } };

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const isProvided = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && ["", "null", "undefined"].includes(v.trim()));

const parseDate = (value) => {
  const date = parseIsoDate(value);
  if (!date) throw httpError("date must be a valid YYYY-MM-DD date");
  return date;
};

const assertStatus = (status) => {
  if (!STATUSES.includes(status)) {
    throw httpError(`Invalid status: "${status}". Allowed: ${STATUSES.join(", ")}`);
  }
};

const cleanText = (value, field) => {
  if (typeof value !== "string") throw httpError(`${field} is required`);
  const text = value.replace(/\r\n?/g, "\n").trim();
  if (!text) throw httpError(`${field} is required`);
  if (text.length > LIMITS[field]) {
    throw httpError(`${field} must be at most ${LIMITS[field]} characters`);
  }
  if (/<[^>]*>/.test(text)) throw httpError(`${field} must be plain text`);
  return text;
};

const present = (row) => ({
  id: row.id,
  date: toIsoDate(row.date),
  ethiopian: toEthiopian(row.date),
  verse: row.verse,
  body: row.body,
  meaning: row.meaning,
});

const presentAdmin = (row) => ({
  ...present(row),
  status: row.status,
  languageId: row.languageId,
  language: row.language,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const withNeighbours = async (row, today) => {
  const base = { languageId: row.languageId, status: "PUBLISHED" };
  const [prev, next] = await Promise.all([
    prisma.misbak.findFirst({
      where: { ...base, date: { lt: row.date } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.misbak.findFirst({
      where: { ...base, date: { gt: row.date, lte: today } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);
  return {
    ...present(row),
    prevDate: prev ? toIsoDate(prev.date) : null,
    nextDate: next ? toIsoDate(next.date) : null,
  };
};

const translateWriteError = (err) => {
  if (err.code === "P2002") {
    throw httpError("A misbak already exists for this date and language", 409);
  }
  if (err.code === "P2003") throw httpError("Unknown language");
  throw err;
};

exports.getToday = async (languageId) => {
  if (!languageId) return null;
  const today = todayInAddis();
  const published = { status: "PUBLISHED", languageId };
  const row =
    (await prisma.misbak.findFirst({ where: { ...published, date: today } })) ||
    (await prisma.misbak.findFirst({
      where: { ...published, date: { lte: today } },
      orderBy: { date: "desc" },
    }));
  return row ? withNeighbours(row, today) : null;
};

exports.getPublicByDate = async (dateText, languageId) => {
  const date = parseDate(dateText);
  if (!languageId) return null;
  const today = todayInAddis();
  if (date > today) return null;
  const row = await prisma.misbak.findFirst({
    where: { status: "PUBLISHED", languageId, date },
  });
  return row ? withNeighbours(row, today) : null;
};

exports.list = async ({ month, status, language }) => {
  const where = {};
  if (isProvided(status)) {
    assertStatus(status);
    where.status = status;
  }
  if (isProvided(language)) where.languageId = language;
  if (isProvided(month)) {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
      throw httpError("month must be YYYY-MM");
    }
    const year = Number(match[1]);
    const index = Number(match[2]) - 1;
    where.date = {
      gte: new Date(Date.UTC(year, index, 1)),
      lt: new Date(Date.UTC(year, index + 1, 1)),
    };
  }
  const rows = await prisma.misbak.findMany({
    where,
    include: { language: LANGUAGE_SELECT },
    orderBy: [{ date: isProvided(month) ? "asc" : "desc" }, { languageId: "asc" }],
    take: 400,
  });
  return rows.map(presentAdmin);
};

exports.getById = async (id) => {
  const row = await prisma.misbak.findUnique({
    where: { id },
    include: { language: LANGUAGE_SELECT },
  });
  return row ? presentAdmin(row) : null;
};

const buildCreateData = (body) => {
  const status = isProvided(body.status) ? body.status : "DRAFT";
  assertStatus(status);
  if (!isProvided(body.language)) throw httpError("language is required");
  return {
    date: parseDate(body.date),
    verse: cleanText(body.verse, "verse"),
    body: cleanText(body.body, "body"),
    meaning: cleanText(body.meaning, "meaning"),
    status,
    languageId: body.language,
  };
};

exports.create = async (body) => {
  const data = buildCreateData(body || {});
  try {
    const row = await prisma.misbak.create({
      data,
      include: { language: LANGUAGE_SELECT },
    });
    return presentAdmin(row);
  } catch (err) {
    return translateWriteError(err);
  }
};

exports.update = async (id, body) => {
  const data = {};
  if (isProvided(body.date)) data.date = parseDate(body.date);
  if (isProvided(body.language)) data.languageId = body.language;
  ["verse", "body", "meaning"].forEach((field) => {
    if (body[field] !== undefined) data[field] = cleanText(body[field], field);
  });
  if (isProvided(body.status)) {
    assertStatus(body.status);
    data.status = body.status;
  }
  try {
    const row = await prisma.misbak.update({
      where: { id },
      data,
      include: { language: LANGUAGE_SELECT },
    });
    return presentAdmin(row);
  } catch (err) {
    if (err.code === "P2025") return null;
    return translateWriteError(err);
  }
};

exports.setStatus = async (id, status) => {
  assertStatus(status);
  try {
    const row = await prisma.misbak.update({
      where: { id },
      data: { status },
      include: { language: LANGUAGE_SELECT },
    });
    return presentAdmin(row);
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

exports.remove = async (id) => {
  try {
    return await prisma.misbak.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

exports.importMany = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError("items must be a non-empty array");
  }
  if (items.length > MAX_IMPORT) {
    throw httpError(`At most ${MAX_IMPORT} items per import`);
  }

  const errors = [];
  const seen = new Set();
  const rows = [];
  items.forEach((item, index) => {
    try {
      const data = buildCreateData(item || {});
      const key = `${toIsoDate(data.date)}|${data.languageId}`;
      if (seen.has(key)) throw httpError("duplicate date and language in this import");
      seen.add(key);
      rows.push(data);
    } catch (err) {
      errors.push(`item ${index + 1}: ${err.message}`);
    }
  });
  if (errors.length) {
    throw httpError(`Import rejected. ${errors.slice(0, 5).join("; ")}`);
  }

  try {
    const result = await prisma.misbak.createMany({ data: rows, skipDuplicates: true });
    return { received: rows.length, created: result.count, skipped: rows.length - result.count };
  } catch (err) {
    return translateWriteError(err);
  }
};
