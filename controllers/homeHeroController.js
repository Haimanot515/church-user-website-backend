const homeHeroService = require("../services/homeHeroService");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "home_hero" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// @desc    Get Home Hero entries for the current language (Newest First)
// @route   GET /api/home-hero
exports.getHero = async (req, res) => {
  try {
    const heroes = await homeHeroService.getHero(req.language);
    res.json(heroes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Create a new Home Hero entry (does NOT touch existing entries)
// @route   POST /api/home-hero
exports.createHero = async (req, res) => {
  try {
    const { title, subtitle, description, name, role, quote, story, language } = req.body;
    let imageUrl = "";
    let storyImageUrl = "";

    if (req.files?.image?.[0]) {
      const result = await uploadToCloudinary(req.files.image[0].buffer);
      imageUrl = result.secure_url;
    }
    if (req.files?.storyImage?.[0]) {
      const result = await uploadToCloudinary(req.files.storyImage[0].buffer);
      storyImageUrl = result.secure_url;
    }

    const hero = await homeHeroService.createHero({
      title,
      subtitle,
      description,
      name,
      role,
      quote,
      story,
      language,
      image: imageUrl,
      storyImage: storyImageUrl,
    });
    res.status(201).json(hero);
  } catch (err) {
    console.error("HomeHero Creation Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Update a specific Home Hero entry by ID
// @route   PUT /api/home-hero/:id
exports.updateHero = async (req, res) => {
  try {
    let imageUrl = "";
    let storyImageUrl = "";

    if (req.files?.image?.[0]) {
      const result = await uploadToCloudinary(req.files.image[0].buffer);
      imageUrl = result.secure_url;
    }
    if (req.files?.storyImage?.[0]) {
      const result = await uploadToCloudinary(req.files.storyImage[0].buffer);
      storyImageUrl = result.secure_url;
    }

    const hero = await homeHeroService.updateHero(req.params.id, req.body, imageUrl, storyImageUrl);
    if (!hero) {
      return res.status(404).json({ msg: "Home Hero entry not found" });
    }
    res.json(hero);
  } catch (err) {
    console.error("HomeHero Update Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Delete a specific Home Hero entry by ID
// @route   DELETE /api/home-hero/:id
exports.deleteHero = async (req, res) => {
  try {
    const hero = await homeHeroService.deleteHero(req.params.id);
    if (!hero) {
      return res.status(404).json({ msg: "Home Hero entry not found" });
    }
    res.json({ msg: "Home Hero entry deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
