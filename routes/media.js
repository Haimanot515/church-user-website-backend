const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  getMedia,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  getLatestMedia,
  getTrendingMedia,
  getRecommendedMedia,
  getFeaturedMedia,
  getMediaByType,
} = require("../controllers/mediaController");


// PUBLIC: Get all media
router.get("/", getMedia);


// PUBLIC: Latest media
router.get("/latest", getLatestMedia);


// PUBLIC: Trending media
router.get("/trending", getTrendingMedia);


// PUBLIC: Recommended media
router.get("/recommended", getRecommendedMedia);


// PUBLIC: Featured media
router.get("/featured", getFeaturedMedia);


// PUBLIC: Get media by type
// Example:
// /api/media/type/photo
// /api/media/type/video
// /api/media/type/audio
router.get("/type/:type", getMediaByType);


// PUBLIC: Get single media
// KEEP THIS LAST
router.get("/:id", getMediaById);


// ADMIN ONLY: Create media
router.post(
  "/",
  auth,
  adminAuth,
  upload.single("media"),
  createMedia
);


// ADMIN ONLY: Update media
router.put(
  "/:id",
  auth,
  adminAuth,
  upload.single("media"),
  updateMedia
);


// ADMIN ONLY: Delete media
router.delete(
  "/:id",
  auth,
  adminAuth,
  deleteMedia
);

module.exports = router;