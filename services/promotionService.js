const prisma = require("../prisma/prisma.service");

const includeLanguage = {
  language: { select: { name: true, code: true } },
};

// Mirrors: Promotion.findOne({ language: req.language }).populate("language","name code").sort({createdAt:-1,_id:-1})
exports.getLatestPromotion = async (languageId) => {
  return prisma.promotion.findFirst({
    where: { languageId },
    include: includeLanguage,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

// Mirrors: Promotion.find({ language: req.language }).populate("language","name code").sort({createdAt:-1,_id:-1})
exports.getPromotion = async (languageId) => {
  return prisma.promotion.findMany({
    where: { languageId },
    include: includeLanguage,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

// Mirrors: Promotion.findById(id).populate("language","name code")
exports.getPromotionById = async (id) => {
  return prisma.promotion.findUnique({
    where: { id },
    include: includeLanguage,
  });
};

// Mirrors: new Promotion({ title, description, language, photo }).save()
exports.createPromotion = async ({ title, description, language, photo }) => {
  return prisma.promotion.create({
    data: {
      title,
      description,
      languageId: language,
      photo,
    },
  });
};

// Mirrors: Promotion.findByIdAndUpdate(id, {...req.body, ...(photoUrl && {photo})}, {new:true})
exports.updatePromotion = async (id, body, photoUrl) => {
  const data = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.language !== undefined) data.languageId = body.language;
  if (photoUrl) data.photo = photoUrl;

  try {
    return await prisma.promotion.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Promotion.findByIdAndDelete(id)
exports.deletePromotion = async (id) => {
  try {
    return await prisma.promotion.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};