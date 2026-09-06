const postService = require("../services/postService");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "posts" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// GET ALL POSTS (Newest first, paginated)
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let categoryId;
    if (req.query.categorySlug) {
      const categoryDoc = await postService.findCategoryBySlug(req.query.categorySlug, req.language);
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
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE POST
exports.getPostById = async (req, res) => {
  try {
    const post = await postService.getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE POST
exports.createPost = async (req, res) => {
  try {
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
      isTrending: req.body.isTrending === "true",
      isRecommended: req.body.isRecommended === "true",
      isFeatured: req.body.isFeatured === "true",
      status: req.body.status || "draft",
      publishedAt: req.body.status === "published" ? new Date() : null,
    });
    res.status(201).json(savedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post", error: err.message });
  }
};

// UPDATE POST
exports.updatePost = async (req, res) => {
  try {
    let imageUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }
    const updateData = {
      ...req.body,
      ...(imageUrl && { imageUrl }),
      updatedAt: new Date(),
    };
    if (req.body.isTrending !== undefined) {
      updateData.isTrending = req.body.isTrending === "true";
    }
    if (req.body.isRecommended !== undefined) {
      updateData.isRecommended = req.body.isRecommended === "true";
    }
    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === "true";
    }

    const post = await postService.updatePost(req.params.id, updateData);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
};

// GET LATEST POSTS
exports.getLatestPosts = async (req, res) => {
  try {
    const posts = await postService.getLatestPosts(req.language);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET TRENDING POSTS
exports.getTrendingPosts = async (req, res) => {
  try {
    const posts = await postService.getTrendingPosts(req.language);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET RECOMMENDED POSTS
exports.getRecommendedPosts = async (req, res) => {
  try {
    const posts = await postService.getRecommendedPosts(req.language);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET FEATURED POSTS
exports.getFeaturedPosts = async (req, res) => {
  try {
    const posts = await postService.getFeaturedPosts(req.language);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
