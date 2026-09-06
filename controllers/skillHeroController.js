const skillHeroService = require("../services/skillHeroService");
const cloudinary = require("../config/cloudinary");

// @desc    Get Skill Hero data (Latest entry)
// @route   GET /api/skill-hero
exports.getSkillHero = async (req, res) => {
  try {
    const hero = await skillHeroService.getSkillHero();
    if (!hero) {
      return res.status(404).json({ msg: "Skill Hero section not found" });
    }
    res.json(hero);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Create or Replace Skill Hero (Admin only)
// @route   POST /api/skill-hero
exports.updateSkillHero = async (req, res) => {
  try {
    const { title, subtitle, description, name, role, quote, story } = req.body;

    await skillHeroService.deleteAllSkillHeroes();

    let imageUrl = "";
    let storyImageUrl = "";

    if (req.files) {
      const uploadToCloudinary = (buffer, folder) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: folder },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          );
          stream.end(buffer);
        });
      };
      if (req.files.image) {
        imageUrl = await uploadToCloudinary(req.files.image[0].buffer, "skill_hero");
      }
      if (req.files.storyImage) {
        storyImageUrl = await uploadToCloudinary(req.files.storyImage[0].buffer, "skill_story");
      }
    }

    const hero = await skillHeroService.createSkillHero({
      title,
      subtitle,
      description,
      name,
      role,
      quote,
      story,
      image: imageUrl,
      storyImage: storyImageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Skill Hero replaced successfully!",
      data: hero,
    });
  } catch (err) {
    console.error("SkillHero Update Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// @desc    Delete all Skill Hero data (Manual DROP)
// @route   DELETE /api/skill-hero
exports.deleteSkillHero = async (req, res) => {
  try {
    await skillHeroService.deleteAllSkillHeroes();
    res.json({ msg: "Skill Hero section dropped successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};
