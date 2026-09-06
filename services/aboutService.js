const prisma = require("../prisma/prisma.service");

// Mirrors: About.find({ language: req.language }).populate("language","name code").sort({ createdAt:-1, _id:-1 })
exports.getAbout = async (languageId) => {
  return prisma.about.findMany({
    where: { languageId },
    include: { language: { select: { name: true, code: true } } },
    // NOTE: original used createdAt desc + _id desc as a tiebreaker.
    // Mongo ObjectIds are monotonically increasing so that tiebreak was
    // meaningful; Prisma UUIDs are random, so "id desc" here does NOT
    // reproduce the same tiebreak order for same-timestamp rows. Flagging
    // since this is the one place behavior can subtly differ — safe to
    // ignore unless two About rows share an identical createdAt.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

// Mirrors: new About({...}).save()
exports.createAbout = async ({ title, churchLeader, description, language, image }) => {
  return prisma.about.create({
    data: {
      title,
      churchLeader,
      description,
      languageId: language,
      image,
    },
  });
};

// Mirrors: About.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
// Controller only ever sets: title, churchLeader, description, language (+ image if a file was uploaded)
exports.updateAbout = async (id, body, imageUrl) => {
  const updateData = {};
  const fields = ["title", "churchLeader", "description"];
  fields.forEach((field) => {
    if (body[field] !== undefined && body[field] !== "null") {
      updateData[field] = body[field];
    }
  });
  if (body.language !== undefined && body.language !== "null") {
    updateData.languageId = body.language;
  }
  if (imageUrl) {
    updateData.image = imageUrl;
  }
  try {
    return await prisma.about.update({ where: { id }, data: updateData });
  } catch (err) {
    if (err.code === "P2025") return null; // matches "Entry not found" 404 path
    throw err;
  }
};

// Mirrors: About.findByIdAndDelete(id)
exports.deleteAbout = async (id) => {
  try {
    return await prisma.about.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};