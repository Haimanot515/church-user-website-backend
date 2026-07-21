const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { 
  getSkillHero, 
  updateSkillHero, 
  deleteSkillHero 
} = require("../controllers/skillHeroController");

// @route   GET /api/skill-hero
// @desc    Publicly accessible to view the skill hero section
router.get("/",auth,getSkillHero);

// @route   POST /api/skill-hero
// @desc    Restricted to admin; uses 'DROP' logic to replace the current skill hero
// @access  Private (Admin)
router.post(
  "/", 
  auth,adminAuth,
  upload.fields([
    { name: "image", maxCount: 1 }, 
    { name: "storyImage", maxCount: 1 }
  ]), 
  updateSkillHero
);

// @route   PUT /api/skill-hero
// @desc    Alternative update route (mapped to the same DROP logic)
// @access  Private (Admin)
router.put(
  "/", 
  auth,adminAuth,
  upload.fields([
    { name: "image", maxCount: 1 }, 
    { name: "storyImage", maxCount: 1 }
  ]), 
  updateSkillHero
);

// @route   DELETE /api/skill-hero
// @desc    Restricted to admin; manually 'DROPS' the skill hero content
// @access  Private (Admin)
router.delete("/", auth,adminAuth, deleteSkillHero);

module.exports = router;