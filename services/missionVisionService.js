const prisma = require("../prisma/prisma.service");

// Mirrors: MissionVision.find({ language: req.language }).populate("language","name code").sort({order:1, createdAt:-1, _id:-1})
exports.getMissionVision = async (languageId) => {
  return prisma.missionVision.findMany({
    where: { languageId },
    include: { language: { select: { name: true, code: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }, { id: "desc" }],
  });
};

// Mirrors: new MissionVision({...}).save()
exports.createMissionVision = async ({ type, title, desc, order, language }) => {
  return prisma.missionVision.create({
    data: {
      type,
      title,
      desc,
      ...(order !== undefined && { order: Number(order) }),
      languageId: language,
    },
  });
};

// Mirrors: MissionVision.findByIdAndUpdate(id, { $set: updateData }, { new:true, runValidators:true })
exports.updateMissionVision = async (id, body) => {
  const data = {};
  const passthroughFields = ["type", "title", "desc"];
  passthroughFields.forEach((f) => {
    if (body[f] !== undefined && body[f] !== "null") data[f] = body[f];
  });
  if (body.order !== undefined && body.order !== "null") data.order = Number(body.order);
  if (body.language !== undefined && body.language !== "null") data.languageId = body.language;

  try {
    return await prisma.missionVision.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: MissionVision.findByIdAndDelete(id)
exports.deleteMissionVision = async (id) => {
  try {
    return await prisma.missionVision.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};