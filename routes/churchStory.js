const router = require("express").Router();
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
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
router.post(
  "/",
  ...protect(P.CHURCH_STORY_MANAGE, "ChurchStory"),
  upload.single("photo"),
  createChurchStory
);
// PUT: Restricted to admin
router.put(
  "/:id",
  ...protect(P.CHURCH_STORY_MANAGE, "ChurchStory"),
  upload.single("photo"),
  updateChurchStory
);
// DELETE: Restricted to admin
router.delete("/:id", ...protect(P.CHURCH_STORY_MANAGE, "ChurchStory"), deleteChurchStory);

module.exports = router;
