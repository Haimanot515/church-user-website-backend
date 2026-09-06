const prisma = require("../prisma/prisma.service");

// Mirrors: ChurchPerson.find(filter).populate("language","name code")
//          .sort({ rankOrder:1, createdAt:-1, _id:-1 })
// NOTE: ChurchPerson has no createdAt field in the Postgres schema, so the
// original createdAt tiebreak can't be reproduced here. Sorting by
// rankOrder then id as a stable secondary key instead. If you want the
// createdAt tiebreak back, add `createdAt DateTime @default(now())` to the
// ChurchPerson model.
exports.getChurchPersons = async (languageId, category) => {
  const where = { languageId };
  if (category) where.category = category;

  return prisma.churchPerson.findMany({
    where,
    include: { language: { select: { name: true, code: true } } },
    orderBy: [{ rankOrder: "asc" }, { id: "desc" }],
  });
};

// Mirrors: ChurchPerson.findById(id).populate("language","name code")
exports.getChurchPersonById = async (id) => {
  return prisma.churchPerson.findUnique({
    where: { id },
    include: { language: { select: { name: true, code: true } } },
  });
};

// Mirrors: new ChurchPerson({...}).save()
exports.createChurchPerson = async ({
  name,
  title,
  description,
  role,
  message,
  category,
  rank,
  rankOrder,
  language,
  photos,
}) => {
  return prisma.churchPerson.create({
    data: {
      name,
      title,
      description,
      role,
      message,
      category,
      rank,
      rankOrder: rankOrder !== undefined ? Number(rankOrder) : 0,
      languageId: language,
      photos: photos || [],
    },
  });
};

// Mirrors: findById (to read existing photos) + findByIdAndUpdate(id, {...}, { new: true })
exports.updateChurchPerson = async (id, body, newPhotoUrls) => {
  const existing = await prisma.churchPerson.findUnique({ where: { id } });
  if (!existing) return null;

  let photos = existing.photos || [];
  if (newPhotoUrls && newPhotoUrls.length > 0) {
    photos =
      body.replacePhotos === "true"
        ? newPhotoUrls
        : [...photos, ...newPhotoUrls];
  }

  const {
    name,
    title,
    description,
    role,
    message,
    category,
    rank,
    rankOrder,
    language,
  } = body;

  const data = {
    ...(name !== undefined && { name }),
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(role !== undefined && { role }),
    ...(message !== undefined && { message }),
    ...(category !== undefined && { category }),
    ...(rank !== undefined && { rank }),
    ...(rankOrder !== undefined && { rankOrder: Number(rankOrder) }),
    ...(language !== undefined && { languageId: language }),
    photos,
  };

  try {
    return await prisma.churchPerson.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null; // matches "not found" 404 path
    throw err;
  }
};

// Mirrors: findById + save() after filtering the photos array
exports.removeChurchPersonPhoto = async (id, photoUrl) => {
  const existing = await prisma.churchPerson.findUnique({ where: { id } });
  if (!existing) return null;

  const photos = (existing.photos || []).filter((url) => url !== photoUrl);

  return prisma.churchPerson.update({
    where: { id },
    data: { photos },
  });
};

// Mirrors: ChurchPerson.findByIdAndDelete(id)
exports.deleteChurchPerson = async (id) => {
  try {
    return await prisma.churchPerson.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};