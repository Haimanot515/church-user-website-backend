const MissionVision = require("../models/Mission-vision");

// @desc    Get MissionVision entries for the current language (Newest First)
// @route   GET /api/mission-vision
exports.getMissionVision = async (req, res) => {
  try {
    const missionVision = await MissionVision.find({ language: req.language })
      .populate("language", "name code")
      .sort({ order: 1, createdAt: -1, _id: -1 });
    res.json(missionVision);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new MissionVision entry
// @route   POST /api/mission-vision
exports.createMissionVision = async (req, res) => {
  try {
    const newMissionVision = new MissionVision({
      type: req.body.type,
      title: req.body.title,
      desc: req.body.desc,
      order: req.body.order,
      language: req.body.language,
    });

    const savedMissionVision = await newMissionVision.save();
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
    const updateData = {};

    // Map body fields — only set fields that were actually provided
    const fields = ["type", "title", "desc", "order", "language"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "null") {
        updateData[field] = req.body[field];
      }
    });

    // This updates a specific entry using its ID (e.g., 6982ff326b288509e3790cfc)
    const missionVision = await MissionVision.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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
    const missionVision = await MissionVision.findByIdAndDelete(req.params.id);
    if (!missionVision) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "MissionVision entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};