const prisma = require("../prisma/prisma.service");

// Derives year/order from `range`, replicating the Mongoose
// pre("validate") hook exactly (including the regex requirement).
// Mongoose's custom validator message is preserved for the 400 case.
const deriveYearAndOrder = (range) => {
  if (!range) return {};
  const match = range.match(/\d{4}/);
  if (!match) {
    const err = new Error(
      `"${range}" is not valid — range must include a 4-digit year (e.g. "1998 - 2006").`
    );
    err.isValidationError = true;
    throw err;
  }
  return { year: match[0], order: parseInt(match[0], 10) };
};

// Mirrors: ChurchStory.countDocuments(filter) + .find(filter).populate(...).sort().skip().limit()
exports.getChurchStories = async (languageId, { skip, take }) => {
  const filter = { languageId };
  const [total, stories] = await Promise.all([
    prisma.churchStory.count({ where: filter }),
    prisma.churchStory.findMany({
      where: filter,
      include: { language: { select: { name: true, code: true } } },
      orderBy: [{ order: "asc" }, { year: "asc" }],
      skip,
      take,
    }),
  ]);
  return { stories, total };
};

// Mirrors: ChurchStory.findById(id).populate("language","name code")
exports.getChurchStoryById = async (id) => {
  return prisma.churchStory.findUnique({
    where: { id },
    include: { language: { select: { name: true, code: true } } },
  });
};

// Mirrors: ChurchStory.create({...sanitizeStoryBody(req.body), photo})
// year/order are computed here (never trusted from the client), same
// as the pre("validate") hook did.
exports.createChurchStory = async (body, photoUrl) => {
  const { year, order } = deriveYearAndOrder(body.range);
  return prisma.churchStory.create({
    data: {
      range: body.range,
      year,
      order,
      title: body.title,
      desc: body.desc,
      ...(body.leader !== undefined && { leader: body.leader }),
      ...(body.leaderRole !== undefined && { leaderRole: body.leaderRole }),
      ...(body.servedBy !== undefined && { servedBy: body.servedBy }),
      ...(photoUrl && { photo: photoUrl }),
      languageId: body.language,
    },
  });
};

// Mirrors: story.save() after Object.assign(story, sanitizeStoryBody(req.body))
// Re-derives year/order from range if range was part of the update,
// exactly like re-running the pre("validate") hook on save().
exports.updateChurchStory = async (id, body, photoUrl) => {
  const data = {};
  const passthroughFields = ["title", "desc", "leader", "leaderRole", "servedBy"];
  passthroughFields.forEach((f) => {
    if (body[f] !== undefined) data[f] = body[f];
  });
  if (body.language !== undefined) data.languageId = body.language;
  if (body.range !== undefined) {
    data.range = body.range;
    const { year, order } = deriveYearAndOrder(body.range);
    data.year = year;
    data.order = order;
  }
  if (photoUrl) data.photo = photoUrl;
  try {
    return await prisma.churchStory.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: ChurchStory.findByIdAndDelete(id)
exports.deleteChurchStory = async (id) => {
  try {
    return await prisma.churchStory.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};