const router = require("express").Router();

const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const upload = require("../middleware/uploadMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

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
router.get("/", optionalAuth, getMedia);

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
router.get("/:id", optionalAuth, getMediaById);

// ADMIN ONLY: Create media
router.post("/", ...protect(P.MEDIA_MANAGE, "Media"), upload.media.single("file"), createMedia);

// ADMIN ONLY: Update media
router.put("/:id", ...protect(P.MEDIA_MANAGE, "Media"), upload.media.single("file"), updateMedia);

// ADMIN ONLY: Delete media
router.delete("/:id", ...protect(P.MEDIA_MANAGE, "Media"), deleteMedia);

module.exports = router;
