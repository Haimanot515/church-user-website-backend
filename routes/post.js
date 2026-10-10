const router = require("express").Router();

const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const upload = require("../middleware/uploadMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getLatestPosts,
  getTrendingPosts,
  getRecommendedPosts,
  getFeaturedPosts,
} = require("../controllers/postController");

// PUBLIC: Get all posts
router.get("/", getPosts);

// PUBLIC: Latest posts
router.get("/latest", getLatestPosts);

// PUBLIC: Trending posts
router.get("/trending", getTrendingPosts);

// PUBLIC: Recommended posts
router.get("/recommended", getRecommendedPosts);

// PUBLIC: Featured posts
router.get("/featured", getFeaturedPosts);

// PUBLIC: Get single post by ID
// KEEP THIS LAST
router.get("/:id", optionalAuth, getPostById);

// ADMIN ONLY: Create post
router.post("/", ...protect(P.POST_MANAGE, "Post"), upload.single("image"), createPost);

// ADMIN ONLY: Update post
router.put("/:id", ...protect(P.POST_MANAGE, "Post"), upload.single("image"), updatePost);

// ADMIN ONLY: Delete post
router.delete("/:id", ...protect(P.POST_MANAGE, "Post"), deletePost);

module.exports = router;
