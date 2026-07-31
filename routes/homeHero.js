const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getHero,
  createHero,
  updateHero,
  deleteHero,
} = require("../controllers/homeHeroController");

// Handles both the hero image and the about/story image in one multipart request
const heroUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "storyImage", maxCount: 1 },
]);

// GET: Publicly accessible to view the hero section
router.get("/", getHero);

// POST: Restricted to admin; used to create a hero entry
router.post("/", auth, adminAuth, heroUpload, createHero);

// PUT: Restricted to admin; used to update a specific hero entry by id
router.put("/:id", auth, adminAuth, heroUpload, updateHero);

// DELETE: Restricted to admin; used to remove a specific hero entry by id
router.delete("/:id", auth, adminAuth, deleteHero);

module.exports = router;