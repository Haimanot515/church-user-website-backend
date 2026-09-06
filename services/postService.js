const prisma = require("../prisma/prisma.service");

const includeAll = {
  author: { select: { name: true } },
  category: { select: { name: true, slug: true } },
  language: { select: { name: true, code: true } },
};

// Mirrors: Category.findOne({ slug: slug.toLowerCase(), language: req.language })
// used by getPosts to resolve categorySlug -> categoryId before filtering
exports.findCategoryBySlug = async (slug, languageId) => {
  return prisma.category.findFirst({
    where: { slug: slug.toLowerCase(), languageId },
  });
};

// Mirrors: Post.find(filter).populate(author/category/language).sort({createdAt:-1,_id:-1}).skip().limit()
//          + Post.countDocuments(filter)
exports.getPosts = async ({ languageId, categoryId, skip, take }) => {
  const filter = {
    status: "published",
    languageId,
    ...(categoryId && { categoryId }),
  };
  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: filter,
      include: includeAll,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.post.count({ where: filter }),
  ]);
  return { posts, totalPosts };
};

// Mirrors: Post.findById(id).populate("author","name").populate("category","name").populate("language","name")
exports.getPostById = async (id) => {
  return prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      category: { select: { name: true } },
      language: { select: { name: true } },
    },
  });
};

// Mirrors: new Post({...}).save()
exports.createPost = async ({
  title,
  description,
  content,
  imageUrl,
  author,
  category,
  language,
  isTrending,
  isRecommended,
  isFeatured,
  status,
  publishedAt,
}) => {
  return prisma.post.create({
    data: {
      title,
      description,
      content,
      imageUrl,
      authorId: author,
      categoryId: category,
      languageId: language,
      isTrending,
      isRecommended,
      isFeatured,
      status,
      publishedAt,
    },
  });
};

// Mirrors: Post.findByIdAndUpdate(id, updateData, {new:true})
// updateData arrives pre-shaped by the controller (imageUrl only if a
// new file was uploaded, booleans already coerced, updatedAt already set)
exports.updatePost = async (id, updateData) => {
  const data = { ...updateData };
  if ("category" in data) {
    data.categoryId = data.category;
    delete data.category;
  }
  if ("language" in data) {
    data.languageId = data.language;
    delete data.language;
  }
  if ("author" in data) {
    data.authorId = data.author;
    delete data.author;
  }
  try {
    return await prisma.post.update({ where: { id }, data });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Post.findByIdAndDelete(id)
exports.deletePost = async (id) => {
  try {
    return await prisma.post.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: Post.find({status:"published", language}).sort({createdAt:-1}).limit(10)
exports.getLatestPosts = async (languageId) => {
  return prisma.post.findMany({
    where: { status: "published", languageId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
};

// Mirrors: Post.find({status:"published", isTrending:true, language}).sort({createdAt:-1})
exports.getTrendingPosts = async (languageId) => {
  return prisma.post.findMany({
    where: { status: "published", isTrending: true, languageId },
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: Post.find({status:"published", isRecommended:true, language}).sort({createdAt:-1})
exports.getRecommendedPosts = async (languageId) => {
  return prisma.post.findMany({
    where: { status: "published", isRecommended: true, languageId },
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: Post.find({status:"published", isFeatured:true, language}).sort({createdAt:-1})
exports.getFeaturedPosts = async (languageId) => {
  return prisma.post.findMany({
    where: { status: "published", isFeatured: true, languageId },
    orderBy: { createdAt: "desc" },
  });
};