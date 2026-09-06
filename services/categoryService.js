const prisma = require("../prisma/prisma.service");

// Mirrors: Category.find({ language: req.language }).sort({ createdAt:-1, _id:-1 })
exports.getCategories = async (languageId) => {
  return prisma.category.findMany({
    where: { languageId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
};

// Mirrors: Category.findById(id)
exports.getCategoryById = async (id) => {
  return prisma.category.findUnique({ where: { id } });
};

// Mirrors: Category.findOne({ slug: slug.toLowerCase(), language: req.language })
exports.getCategoryBySlug = async (slug, languageId) => {
  return prisma.category.findFirst({
    where: { slug: slug.toLowerCase(), languageId },
  });
};

// Mirrors the two manual pre-checks + create in createCategory controller:
//   1. Category.findOne({ name, language }) -> "already exists"
//   2. Category.findOne({ slug, language }) -> "slug already exists"
//   3. Category.create(...)
// Kept as three explicit steps (not relying solely on the DB's @@unique
// constraint) so the exact same two distinct error messages are still
// produced by the controller, unchanged.
exports.findByNameAndLanguage = async (name, languageId) => {
  return prisma.category.findFirst({ where: { name, languageId } });
};

exports.findBySlugAndLanguage = async (slug, languageId) => {
  return prisma.category.findFirst({ where: { slug, languageId } });
};

exports.createCategory = async ({ name, slug, description, language }) => {
  return prisma.category.create({
    data: {
      name,
      slug,
      description,
      languageId: language,
    },
  });
};

// Mirrors the update controller's pre-checks:
//   - if name/language changing, find conflicting name+language excluding self
//   - if slug changing, find conflicting slug+language excluding self
//   - Category.findByIdAndUpdate(id, {...req.body, updatedAt}, {new:true})
exports.findConflictingName = async (name, languageId, excludeId) => {
  return prisma.category.findFirst({
    where: { name, languageId, NOT: { id: excludeId } },
  });
};

exports.findConflictingSlug = async (slug, languageId, excludeId) => {
  return prisma.category.findFirst({
    where: { slug, languageId, NOT: { id: excludeId } },
  });
};

exports.updateCategory = async (id, body) => {
  const updateData = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.slug !== undefined) updateData.slug = body.slug;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.language !== undefined) updateData.languageId = body.language;
  try {
    return await prisma.category.update({ where: { id }, data: updateData });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Category.findByIdAndDelete(id)
exports.deleteCategory = async (id) => {
  try {
    return await prisma.category.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};