const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const {
  getMissionVision,
  createMissionVision,
  updateMissionVision,
  deleteMissionVision,
} = require("../controllers/mission-visionController");

// GET: Publicly accessible to view the mission/vision section
router.get("/", getMissionVision);

// POST: Restricted to admin; used to create a mission or vision entry
router.post("/", auth, adminAuth, createMissionVision);

// PUT: Restricted to admin; used to update a specific entry by ID
router.put("/:id", auth, adminAuth, updateMissionVision);

// DELETE: Restricted to admin; used to delete a specific entry by ID
router.delete("/:id", auth, adminAuth, deleteMissionVision);

module.exports = router;