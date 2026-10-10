const router = require("express").Router();
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
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

// GET /api/homeheros — Publicly accessible to view the hero section
router.get("/", getHero);

// POST /api/homeheros — Restricted to admin; used to create a hero entry
router.post("/", ...protect(P.HOME_HERO_MANAGE, "HomeHero"), heroUpload, createHero);

// PUT /api/homeheros/:id — Restricted to admin; used to update a specific hero entry
router.put("/:id", ...protect(P.HOME_HERO_MANAGE, "HomeHero"), heroUpload, updateHero);

// DELETE /api/homeheros/:id — Restricted to admin; used to remove a specific hero entry
router.delete("/:id", ...protect(P.HOME_HERO_MANAGE, "HomeHero"), deleteHero);

module.exports = router;
