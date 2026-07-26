const ChurchStory = require("../models/ChurchStory");
const cloudinary = require("../config/cloudinary");

// Helper function to handle Cloudinary stream uploads
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "church-story" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// GET /church-story?page=&limit=
// Publicly accessible — returns chapters sorted oldest-first (by order, then year)
exports.getChurchStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = ChurchStory.find().sort({ order: 1, year: 1 });
    const total = await ChurchStory.countDocuments();

    const stories = await query
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      stories,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /church-story/:id
// Publicly accessible — a single chapter
exports.getChurchStoryById = async (req, res) => {
  try {
    const story = await ChurchStory.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /church-story
// Admin only
exports.createChurchStory = async (req, res) => {
  try {
    let photoUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }

    const story = await ChurchStory.create({
      ...req.body,
      ...(photoUrl && { photo: photoUrl }),
    });

    res.status(201).json(story);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// PUT /church-story/:id
// Admin only
exports.updateChurchStory = async (req, res) => {
  try {
    let photoUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }

    const story = await ChurchStory.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...(photoUrl && { photo: photoUrl }),
      },
      { new: true, runValidators: true }
    );

    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json(story);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// DELETE /church-story/:id
// Admin only
exports.deleteChurchStory = async (req, res) => {
  try {
    const story = await ChurchStory.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json({ message: "Chapter deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};