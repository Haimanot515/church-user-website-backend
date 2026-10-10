const postService = require("../services/postService");
const { hasPermission } = require("../utils/access");
const { P } = require("../config/permissions");
const cloudinary = require("../config/cloudinary");
const sendError = require("../utils/sendError");
const pick = require("../utils/pick");
const { parsePagination } = require("../utils/pagination");

const STATUSES = ["draft", "published"];
const bool = (v) => v === true || v === "true";

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "posts" }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(fileBuffer);
  });
};

// GET ALL POSTS (Newest first, paginated)
exports.getPosts = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });

    let categoryId;
    if (req.query.categorySlug) {
      const categoryDoc = await postService.findCategoryBySlug(
        req.query.categorySlug,
        req.language
      );
      if (categoryDoc) {
        categoryId = categoryDoc.id;
      } else {
        return res.json({
          posts: [],
          currentPage: page,
          totalPages: 0,
          totalPosts: 0,
        });
      }
    }

    const { posts, totalPosts } = await postService.getPosts({
      languageId: req.language,
      categoryId,
      skip,
      take: limit,
    });

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET SINGLE POST
exports.getPostById = async (req, res) => {
  try {
    const post = await postService.getPostById(req.params.id);
    // Drafts are only visible to admins.
    const admin = hasPermission(req.user, P.POST_MANAGE);
    if (!post || (post.status !== "published" && !admin)) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    sendError(res, err);
  }
};

// CREATE POST
exports.createPost = async (req, res) => {
  try {
    if (req.body.status !== undefined && !STATUSES.includes(req.body.status)) {
      return res.status(400).json({ message: "status must be 'draft' or 'published'." });
    }
    let imageUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }
    const savedPost = await postService.createPost({
      title: req.body.title,
      description: req.body.description,
      content: req.body.content,
      imageUrl,
      author: req.user.id,
      category: req.body.category,
      language: req.body.language,
      isTrending: bool(req.body.isTrending),
      isRecommended: bool(req.body.isRecommended),
      isFeatured: bool(req.body.isFeatured),
      status: req.body.status || "draft",
      publishedAt: req.body.status === "published" ? new Date() : null,
    });
    res.status(201).json(savedPost);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to create post");
  }
};

// UPDATE POST
exports.updatePost = async (req, res) => {
  try {
    // Whitelist editable fields (no author/id/timestamps from the client).
    const updateData = pick(req.body, [
      "title",
      "description",
      "content",
      "category",
      "language",
      "status",
    ]);
    if (updateData.status !== undefined && !STATUSES.includes(updateData.status)) {
      return res.status(400).json({ message: "status must be 'draft' or 'published'." });
    }
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      updateData.imageUrl = result.secure_url;
    }
    updateData.updatedAt = new Date();
    for (const flag of ["isTrending", "isRecommended", "isFeatured"]) {
      if (req.body[flag] !== undefined) updateData[flag] = bool(req.body[flag]);
    }

    const post = await postService.updatePost(req.params.id, updateData);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    sendError(res, err);
  }
};

// DELETE POST
exports.deletePost = async (req, res) => {
  try {
    const post = await postService.deletePost(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    sendError(res, err);
  }
};

// GET LATEST POSTS
exports.getLatestPosts = async (req, res) => {
  try {
    const posts = await postService.getLatestPosts(req.language);
    res.json(posts);
  } catch (err) {
    sendError(res, err);
  }
};

// GET TRENDING POSTS
exports.getTrendingPosts = async (req, res) => {
  try {
    const posts = await postService.getTrendingPosts(req.language);
    res.json(posts);
  } catch (err) {
    sendError(res, err);
  }
};

// GET RECOMMENDED POSTS
exports.getRecommendedPosts = async (req, res) => {
  try {
    const posts = await postService.getRecommendedPosts(req.language);
    res.json(posts);
  } catch (err) {
    sendError(res, err);
  }
};

// GET FEATURED POSTS
exports.getFeaturedPosts = async (req, res) => {
  try {
    const posts = await postService.getFeaturedPosts(req.language);
    res.json(posts);
  } catch (err) {
    sendError(res, err);
  }
};
