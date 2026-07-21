const ProjectHero = require("../models/projectHero");
const cloudinary = require("../config/cloudinary");

// @desc    Get Project Hero data (Latest entry)
// @route   GET /api/project-hero
exports.getProjectHero = async (req, res) => {
  try {
    const hero = await ProjectHero.findOne().sort({ createdAt: -1 });

    if (!hero) {
      return res.status(404).json({ msg: "Project Hero section not found" });
    }
    res.json(hero);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Create or Replace Project Hero (Admin only)
// @route   POST /api/project-hero
exports.updateProjectHero = async (req, res) => {
  try {
    const { title, subtitle, description, name, role, quote, story } = req.body;

    // 1. DROP logic: Clear existing records before creating a new one
    // This ensures only one portfolio header exists at a time
    await ProjectHero.deleteMany({});

    let imageUrl = "";
    let storyImageUrl = "";

    // 2. Cloudinary Upload Logic (Multiple Files)
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
        imageUrl = await uploadToCloudinary(req.files.image[0].buffer, "project_hero");
      }
      if (req.files.storyImage) {
        storyImageUrl = await uploadToCloudinary(req.files.storyImage[0].buffer, "project_story");
      }
    }

    // 3. Create fresh record
    const hero = await ProjectHero.create({
      title,
      subtitle,
      description,
      name,
      role,
      quote,
      story,
      image: imageUrl,
      storyImage: storyImageUrl
    });

    res.status(201).json({
      success: true,
      message: "✅ Portfolio Hero 'DROPPED' and replaced successfully!",
      data: hero
    });
  } catch (err) {
    console.error("ProjectHero Update Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// @desc    Delete all Project Hero data
// @route   DELETE /api/project-hero
exports.deleteProjectHero = async (req, res) => {
  try {
    await ProjectHero.deleteMany({});
    res.json({ msg: "Project Hero section deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};
