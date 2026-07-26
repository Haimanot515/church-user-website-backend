const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getChurchStories,
  getChurchStoryById,
  createChurchStory,
  updateChurchStory,
  deleteChurchStory,
} = require("../controllers/churchStoryController");

// GET: Publicly accessible — list all chapters (paginated)
router.get("/", getChurchStories);
// GET: Publicly accessible — single chapter by id
router.get("/:id", getChurchStoryById);
// POST: Restricted to admin
router.post("/", auth, adminAuth, upload.single("photo"), createChurchStory);
// PUT: Restricted to admin
router.put("/:id", auth, adminAuth, upload.single("photo"), updateChurchStory);
// DELETE: Restricted to admin
router.delete("/:id", auth, adminAuth, deleteChurchStory);

module.exports = router;