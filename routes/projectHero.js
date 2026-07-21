const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");

const upload = require("../middleware/uploadMiddleware");
const { 
  getProjectHero, 
  updateProjectHero, 
  deleteProjectHero 
} = require("../controllers/projectHeroController");

// GET: Publicly accessible to view the portfolio hero section
router.get("/",auth, getProjectHero);

// POST: Restricted to admin; uses 'DROP' logic to replace the current hero section
// Handles both 'image' and 'storyImage' fields
router.post(
  "/", 
  auth,adminAuth,
  upload.fields([
    { name: "image", maxCount: 1 }, 
    { name: "storyImage", maxCount: 1 }
  ]), 
  updateProjectHero
);

// PUT: Restricted to admin; alternative way to update existing fields
router.put(
  "/", 
  auth,adminAuth,
  upload.fields([
    { name: "image", maxCount: 1 }, 
    { name: "storyImage", maxCount: 1 }
  ]), 
  updateProjectHero
);

// DELETE: Restricted to admin; used to 'DROP' the portfolio hero content
router.delete("/", auth,adminAuth,deleteProjectHero);

module.exports = router;