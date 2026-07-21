const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  getPosts,getPostById,createPost,updatePost,deletePost,getLatestPosts,getTrendingPosts,getRecommendedPosts,getFeaturedPosts} = require("../controllers/postController");


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
router.get("/:id", getPostById);



// ADMIN ONLY: Create post
router.post(
  "/",
  auth,
  adminAuth,
  upload.single("image"),
  createPost
);


// ADMIN ONLY: Update post
router.put(
  "/:id",
  auth,
  adminAuth,
  upload.single("image"),
  updatePost
);


// ADMIN ONLY: Delete post
router.delete(
  "/:id",
  auth,
  adminAuth,
  deletePost
);


module.exports = router;