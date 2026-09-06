const prisma = require("../prisma/prisma.service");

// Mirrors: Church.updateMany({ language, isPrimary: true }, { isPrimary: false })
// Scoped PER LANGUAGE (matches controller comment exactly)
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

// Mirrors: Church.create({...})
exports.createChurch = async ({
  churchName,
  description,
  history,
  image,
  address,
  serviceDays,
  serviceTime,
  language,
  isFeatured,
  isPrimary,
}) => {
  return prisma.church.create({
    data: {
      churchName,
      description,
      ...(history !== undefined && { history }),
      image,
      ...(address !== undefined && { address }),
      ...(serviceDays !== undefined && { serviceDays }),
      ...(serviceTime !== undefined && { serviceTime }),
      languageId: language,
      ...(isFeatured !== undefined && { isFeatured }),
      isPrimary,
    },
  });
};

// Mirrors: Church.find({ language: req.language }).populate("language","name code").sort({createdAt:-1})
exports.getChurches = async (languageId) => {
  return prisma.church.findMany({
    where: { languageId },
    include: { language: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: Church.findById(id).populate("language","name code")
exports.getChurchById = async (id) => {
  return prisma.church.findUnique({
    where: { id },
    include: { language: { select: { name: true, code: true } } },
  });
};

// Mirrors: Church.findOne({ isPrimary: true, language: req.language }).populate("language","name code")
exports.getPrimaryChurch = async (languageId) => {
  return prisma.church.findFirst({
    where: { isPrimary: true, languageId },
    include: { language: { select: { name: true, code: true } } },
  });
};

// Mirrors: Church.findById(id) (used by controller before deciding update's languageId fallback)
exports.findById = async (id) => {
  return prisma.church.findUnique({ where: { id } });
};

// Mirrors: Church.findByIdAndUpdate(id, updateData, {new:true, runValidators:true}).populate("language","name code")
exports.updateChurch = async (id, updateData) => {
  const data = {};
  const passthroughFields = ["churchName", "description", "history", "address", "serviceDays", "serviceTime"];
  passthroughFields.forEach((f) => {
    if (updateData[f] !== undefined) data[f] = updateData[f];
  });
  if (updateData.language !== undefined) data.languageId = updateData.language;
  if (updateData.isFeatured !== undefined) data.isFeatured = updateData.isFeatured;
  if (updateData.isPrimary !== undefined) data.isPrimary = updateData.isPrimary;
  if (updateData.image) data.image = updateData.image;

  try {
    return await prisma.church.update({
      where: { id },
      data,
      include: { language: { select: { name: true, code: true } } },
    });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Church.findByIdAndDelete(id)
exports.deleteChurch = async (id) => {
  try {
    return await prisma.church.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};