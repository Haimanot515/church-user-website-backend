const prisma = require("../prisma/prisma.service");

// Mirrors: Language.find().sort({createdAt:-1, _id:-1})
exports.getLanguages = async () => {
  return prisma.language.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

// Mirrors: Language.findById(id)
exports.getLanguageById = async (id) => {
  return prisma.language.findUnique({ where: { id } });
};

// Mirrors: Language.findOne({ code: code.toUpperCase() })
exports.findByCode = async (code) => {
  return prisma.language.findUnique({ where: { code: code.toUpperCase() } });
};

// Mirrors: new Language({ name, code: code.toUpperCase() }).save()
exports.createLanguage = async ({ name, code }) => {
  return prisma.language.create({
    data: { name, code: code.toUpperCase() },
  });
};

// Mirrors: Language.findOne({ code: code.toUpperCase(), _id: { $ne: id } })
// used by updateLanguage to check for code collisions excluding itself
exports.findByCodeExcludingId = async (code, excludeId) => {
  return prisma.language.findFirst({
    where: { code: code.toUpperCase(), NOT: { id: excludeId } },
  });
};

// Mirrors: Language.findByIdAndUpdate(id, {...req.body, updatedAt: Date.now()}, {new:true})
exports.updateLanguage = async (id, body) => {
  const data = { updatedAt: new Date() };
  if (body.name !== undefined) data.name = body.name;
  if (body.code !== undefined) data.code = body.code.toUpperCase();

  try {
    return await prisma.language.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Language.findByIdAndDelete(id)
exports.deleteLanguage = async (id) => {
  try {
    return await prisma.language.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};