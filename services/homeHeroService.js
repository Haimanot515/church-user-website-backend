const prisma = require("../prisma/prisma.service");

// Mirrors: HomeHero.find({ language: req.language }).populate("language","name code").sort({createdAt:-1})
exports.getHero = async (languageId) => {
  return prisma.homeHero.findMany({
    where: { languageId },
    include: { language: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: HomeHero.create({...}) — NOT a singleton, adds a new row
// alongside existing entries (confirmed: no deleteMany/DROP logic here,
// unlike ProjectHero/SkillHero)
exports.createHero = async ({
  title,
  subtitle,
  description,
  name,
  role,
  quote,
  story,
  language,
  image,
  storyImage,
}) => {
  return prisma.homeHero.create({
    data: {
      title,
      subtitle,
      description,
      name,
      role,
      quote,
      story,
      languageId: language,
      image,
      storyImage,
    },
  });
};

// Mirrors: HomeHero.findByIdAndUpdate(id, { $set: updateData }, { new:true, runValidators:true })
exports.updateHero = async (id, body, imageUrl, storyImageUrl) => {
  const data = {};
  const passthroughFields = ["title", "subtitle", "description", "name", "role", "quote", "story"];
  passthroughFields.forEach((f) => {
    if (body[f] !== undefined && body[f] !== "null") data[f] = body[f];
  });
  if (body.language !== undefined && body.language !== "null") data.languageId = body.language;
  if (imageUrl) data.image = imageUrl;
  if (storyImageUrl) data.storyImage = storyImageUrl;

  try {
    return await prisma.homeHero.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: HomeHero.findByIdAndDelete(id)
exports.deleteHero = async (id) => {
  try {
    return await prisma.homeHero.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Used by authService/authController to pull a display image for the
// verification email. Mirrors: HomeHero.findOne().sort({createdAt:-1})
// (No language filter — matches authController's original query exactly.)
exports.getLatestHomeHeroAnyLanguage = async () => {
  return prisma.homeHero.findFirst({
    orderBy: { createdAt: "desc" },
  });
};