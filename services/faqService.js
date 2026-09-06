const prisma = require("../prisma/prisma.service");

// Mirrors: Faq.find(filter).populate("language","name code").sort({category:1, order:1, createdAt:-1, _id:-1})
exports.getFaq = async (languageId, category) => {
  return prisma.faq.findMany({
    where: {
      languageId,
      ...(category && { category }),
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

// Mirrors: Faq.schema.path("category").enumValues
// Mongoose-specific schema introspection has no Prisma equivalent —
// the valid category list is now a static array matching the
// FaqCategory enum defined in schema.prisma. Must be kept in sync
// manually if the enum ever changes.
exports.getFaqCategories = () => {
  return ["Information", "Faith", "Contact"];
};

// Mirrors: new Faq({...}).save()
exports.createFaq = async ({ question, answer, category, order, language }) => {
  return prisma.faq.create({
    data: {
      question,
      answer,
      category,
      ...(order !== undefined && { order: Number(order) }),
      languageId: language,
    },
  });
};

// Mirrors: Faq.findByIdAndUpdate(id, { $set: updateData }, { new:true, runValidators:true })
exports.updateFaq = async (id, body) => {
  const data = {};
  const passthroughFields = ["question", "answer", "category"];
  passthroughFields.forEach((f) => {
    if (body[f] !== undefined && body[f] !== "null") data[f] = body[f];
  });
  if (body.order !== undefined && body.order !== "null") data.order = Number(body.order);
  if (body.language !== undefined && body.language !== "null") data.languageId = body.language;

  try {
    return await prisma.faq.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Faq.findByIdAndDelete(id)
exports.deleteFaq = async (id) => {
  try {
    return await prisma.faq.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};