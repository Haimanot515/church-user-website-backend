const prisma = require("../prisma/prisma.service");
const { FaqCategory } = require("@prisma/client");

/* ------------------------------ helpers ------------------------------ */

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

// Skip undefined, null, "", and the literal "null"/"undefined" strings
// that some form clients send.
const isProvided = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && ["", "null", "undefined"].includes(v.trim()));

// Number("") is 0 and Number("abc") is NaN, both bad for an Int column.
const toInt = (v, field = "value") => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw httpError(`${field} must be a whole number`);
  return n;
};

const assertCategory = (category) => {
  if (!Object.values(FaqCategory).includes(category)) {
    throw httpError(
      `Invalid category: "${category}". Allowed: ${Object.values(FaqCategory).join(", ")}`
    );
  }
};

/* ------------------------------ queries ------------------------------ */

exports.getFaq = async (languageId, category) => {
  // An invalid enum in a where clause makes Prisma throw, so validate first
  if (isProvided(category)) assertCategory(category);

  return prisma.faq.findMany({
    where: {
      languageId,
      ...(isProvided(category) && { category }),
    },
    include: { language: { select: { name: true, code: true } } },
    orderBy: [
      { category: "asc" },
      { order: "asc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });
};

// Read from the generated enum, so it can never drift out of sync with schema.prisma
exports.getFaqCategories = () => Object.values(FaqCategory);

/* ------------------------------ create ------------------------------- */

exports.createFaq = async ({ question, answer, category, order, language }) => {
  assertCategory(category);

  return prisma.faq.create({
    data: {
      question,
      answer,
      category,
      ...(isProvided(order) && { order: toInt(order, "order") }),
      languageId: language,
    },
  });
};

/* ------------------------------ update ------------------------------- */

exports.updateFaq = async (id, body) => {
  const data = {};

  ["question", "answer", "category"].forEach((f) => {
    if (isProvided(body[f])) data[f] = body[f];
  });

  if (data.category !== undefined) assertCategory(data.category);
  if (isProvided(body.order)) data.order = toInt(body.order, "order");
  if (isProvided(body.language)) data.languageId = body.language;

  try {
    return await prisma.faq.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    throw err;
  }
};

/* ------------------------------ delete ------------------------------- */

exports.deleteFaq = async (id) => {
  try {
    return await prisma.faq.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null; // record not found
    throw err;
  }
};