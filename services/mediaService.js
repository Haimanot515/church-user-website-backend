const prisma = require("../prisma/prisma.service");

const includeAll = {
  author: { select: { name: true } },
  category: { select: { name: true } },
  language: { select: { name: true, code: true } },
};

const includeCategoryOnly = {
  category: { select: { name: true } },
};

// Mirrors: Media.find().populate("author","name").populate("category","name").populate("language","name code").sort({createdAt:-1,_id:-1})
exports.getMedia = async () => {
  return prisma.media.findMany({
    include: includeAll,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

// Mirrors: Media.findById(id).populate(author/category/language)
exports.getMediaById = async (id) => {
  return prisma.media.findUnique({
    where: { id },
    include: includeAll,
  });
};

// Mirrors: new Media({...}).save()
exports.createMedia = async (data) => {
  return prisma.media.create({
    data: {
      title: data.title,
      description: data.description,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl,
      publicId: data.publicId,
      resourceType: data.resourceType,
      thumbnail: data.thumbnail,
      duration: data.duration,
      authorId: data.author,
      categoryId: data.category, // already cleanRef()'d by controller (undefined if "")
      languageId: data.language, // already cleanRef()'d + falls back to req.language in controller
      isTrending: data.isTrending,
      isRecommended: data.isRecommended,
      isFeatured: data.isFeatured,
      status: data.status,
      publishedAt: data.publishedAt,
    },
  });
};

// Mirrors: Media.findByIdAndUpdate(id, updateData, {new:true})
// updateData arrives pre-shaped by the controller (mediaType renamed
// from "type", category/language already cleanRef()'d, booleans already
// coerced from "true"/"false" strings). This service just maps the
// remaining Mongoose-ref field names to Prisma's *Id field names.
exports.updateMedia = async (id, updateData) => {
  const data = { ...updateData };
  if ("category" in data) {
    data.categoryId = data.category;
    delete data.category;
  }
  if ("language" in data) {
    data.languageId = data.language;
    delete data.language;
  }
  try {
    return await prisma.media.update({
      where: { id },
      data,
      include: includeAll,
    });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Media.findByIdAndDelete(id)
exports.deleteMedia = async (id) => {
  try {
    return await prisma.media.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Media.find({status:"published", language}).populate("category","name").sort({createdAt:-1}).limit(10)
exports.getLatestMedia = async (languageId) => {
  return prisma.media.findMany({
    where: { status: "published", languageId },
    include: includeCategoryOnly,
    orderBy: { createdAt: "desc" },
    take: 10,
  });
};

// Mirrors: Media.find({status:"published", isTrending:true, language}).populate("category","name").sort({createdAt:-1})
exports.getTrendingMedia = async (languageId) => {
  return prisma.media.findMany({
    where: { status: "published", isTrending: true, languageId },
    include: includeCategoryOnly,
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: Media.find({status:"published", isFeatured:true, language}).populate("category","name").sort({createdAt:-1})
exports.getFeaturedMedia = async (languageId) => {
  return prisma.media.findMany({
    where: { status: "published", isFeatured: true, languageId },
    include: includeCategoryOnly,
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: Media.find({status:"published", isRecommended:true, language}).populate("category","name").sort({createdAt:-1})
exports.getRecommendedMedia = async (languageId) => {
  return prisma.media.findMany({
    where: { status: "published", isRecommended: true, languageId },
    include: includeCategoryOnly,
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: Media.find({status:"published", mediaType: type, language}).populate("category","name").sort({createdAt:-1})
exports.getMediaByType = async (mediaType, languageId) => {
  return prisma.media.findMany({
    where: { status: "published", mediaType, languageId },
    include: includeCategoryOnly,
    orderBy: { createdAt: "desc" },
  });
};