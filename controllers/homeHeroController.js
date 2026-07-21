const HomeHero = require("../models/homeHero");
const cloudinary = require("../config/cloudinary");

// @desc    Get Home Hero data (Latest entry)
// @route   GET /api/home-hero
exports.getHero = async (req, res) => {
  try {
    const hero = await HomeHero.findOne().sort({ createdAt: -1 });

    if (!hero) {
      return res.status(404).json({ msg: "Hero section not found" });
    }
    res.json(hero);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Create or Replace Home Hero (Admin only)
// @route   POST /api/home-hero
exports.createHero = async (req, res) => {
  try {
    const { title, subtitle, description, name, role, quote, story } = req.body;

    // 1. DROP logic: Clear existing records before creating a new one
    await HomeHero.deleteMany({});

    let imageUrl = "";

    // 2. Cloudinary Upload Logic for new record
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "home_hero" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    // 3. Create fresh record
    const hero = await HomeHero.create({
      title,
      subtitle,
      description,
      name,
      role,
      quote,
      story,
      image: imageUrl
    });

    res.status(201).json(hero);
  } catch (err) {
    console.error("HomeHero Creation Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Update Home Hero (Keep existing photo if not changed)
// @route   PUT /api/home-hero
exports.updateHero = async (req, res) => {
  try {
    const updateData = {};

    // 1. Map body fields
    // We removed the strict 'empty string' check that was blocking your description
    const fields = ["title", "subtitle", "description", "name", "role", "quote", "story"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "null") {
        updateData[field] = req.body[field];
      }
    });

    // 2. Image Logic: Check if a NEW file is uploaded
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "home_hero" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      updateData.image = result.secure_url;
    }

    // 3. Update the single document using $set
    // This ensures only the fields provided are changed
    const hero = await HomeHero.findOneAndUpdate(
      {}, 
      { $set: updateData }, 
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json(hero);
  } catch (err) {
    console.error("HomeHero Update Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Delete all Home Hero data
// @route   DELETE /api/home-hero
exports.deleteHero = async (req, res) => {
  try {
    // DROP logic: wipes the collection
    await HomeHero.deleteMany({});
    res.json({ msg: "Home Hero section deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
