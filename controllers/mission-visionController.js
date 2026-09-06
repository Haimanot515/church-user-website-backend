const missionVisionService = require("../services/missionVisionService");

// @desc    Get MissionVision entries for the current language (Newest First)
// @route   GET /api/mission-vision
exports.getMissionVision = async (req, res) => {
  try {
    const missionVision = await missionVisionService.getMissionVision(req.language);
    res.json(missionVision);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new MissionVision entry
// @route   POST /api/mission-vision
exports.createMissionVision = async (req, res) => {
  try {
    const savedMissionVision = await missionVisionService.createMissionVision({
      type: req.body.type,
      title: req.body.title,
      desc: req.body.desc,
      order: req.body.order,
      language: req.body.language,
    });
    res.status(201).json(savedMissionVision);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create MissionVision entry", error: err.message });
  }
};

// @desc    Update a specific MissionVision entry by ID
// @route   PUT /api/mission-vision/:id
exports.updateMissionVision = async (req, res) => {
  try {
    const missionVision = await missionVisionService.updateMissionVision(req.params.id, req.body);
    if (!missionVision) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.json(missionVision);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a specific MissionVision entry by ID
// @route   DELETE /api/mission-vision/:id
exports.deleteMissionVision = async (req, res) => {
  try {
    const missionVision = await missionVisionService.deleteMissionVision(req.params.id);
    if (!missionVision) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "MissionVision entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
