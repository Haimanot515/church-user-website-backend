const HomeHero = require("../models/homeHero");
const cloudinary = require("../config/cloudinary");

// Helper: upload a single file buffer to Cloudinary
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
    const heroes = await HomeHero.find({ language: req.language })
      .populate("language", "name code")
      .sort({ createdAt: -1 });
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

    const hero = await HomeHero.create({
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

// @desc    Update a specific Home Hero entry by ID (keeps existing images if not changed)
// @route   PUT /api/home-hero/:id
exports.updateHero = async (req, res) => {
  try {
    const updateData = {};

    // Map body fields — only set fields that were actually provided
    const fields = ["title", "subtitle", "description", "name", "role", "quote", "story", "language"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "null") {
        updateData[field] = req.body[field];
      }
    });

    // Only overwrite images if new files were uploaded
    if (req.files?.image?.[0]) {
      const result = await uploadToCloudinary(req.files.image[0].buffer);
      updateData.image = result.secure_url;
    }

    if (req.files?.storyImage?.[0]) {
      const result = await uploadToCloudinary(req.files.storyImage[0].buffer);
      updateData.storyImage = result.secure_url;
    }

    const hero = await HomeHero.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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
    const hero = await HomeHero.findByIdAndDelete(req.params.id);

    if (!hero) {
      return res.status(404).json({ msg: "Home Hero entry not found" });
    }

    res.json({ msg: "Home Hero entry deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};