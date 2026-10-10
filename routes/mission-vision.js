const router = require("express").Router();
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const {
  getMissionVision,
  createMissionVision,
  updateMissionVision,
  deleteMissionVision,
} = require("../controllers/mission-visionController");

// GET: Publicly accessible to view the mission/vision section
router.get("/", getMissionVision);

// POST: Restricted to admin; used to create a mission or vision entry
router.post("/", ...protect(P.MISSION_VISION_MANAGE, "MissionVision"), createMissionVision);

// PUT: Restricted to admin; used to update a specific entry by ID
router.put("/:id", ...protect(P.MISSION_VISION_MANAGE, "MissionVision"), updateMissionVision);

// DELETE: Restricted to admin; used to delete a specific entry by ID
router.delete("/:id", ...protect(P.MISSION_VISION_MANAGE, "MissionVision"), deleteMissionVision);

module.exports = router;
