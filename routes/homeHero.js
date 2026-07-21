const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { 
  getHero, 
  createHero, 
  updateHero, 
  deleteHero 
} = require("../controllers/homeHeroController");

// GET: Publicly accessible to view the hero section
router.get("/", getHero);

// POST: Restricted to admin; used to create the hero section for the first time
router.post("/", auth,adminAuth, upload.single("image"), createHero);

// PUT: Restricted to admin; used to update the existing hero section
router.put("/", auth,adminAuth,upload.single("image"), updateHero);

// DELETE: Restricted to admin; used to remove the hero section content
router.delete("/", auth,adminAuth, deleteHero);

module.exports = router;