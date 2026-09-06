const skillService = require("../services/skillService");

exports.getSkills = async (req, res) => {
  try {
    const skills = await skillService.getSkills();
    res.status(200).json(skills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.createSkill = async (req, res) => {
  try {
    const { name, level, category } = req.body;

    if (!name || !level) {
      return res.status(400).json({ msg: "Name and level are required" });
    }

    const skill = await skillService.createSkill({ name, level, category });
    res.status(201).json({ msg: "Skill created successfully", skill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
