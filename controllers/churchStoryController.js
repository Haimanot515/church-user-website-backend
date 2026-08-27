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

// Strips fields the system computes itself so a client can never override
// year/order by sending them directly.
const sanitizeStoryBody = (body) => {
  const { order, year, ...safeBody } = body;
  return safeBody;
};

// GET /church-story?page=&limit=
// Publicly accessible — returns chapters for the current language,
// sorted oldest-first (by order, then year)
// @route   GET /api/church-story
exports.getChurchStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = { language: req.language };

    const total = await ChurchStory.countDocuments(filter);

    const stories = await ChurchStory.find(filter)
      .populate("language", "name code")
      .sort({ order: 1, year: 1 })
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
// @route   GET /api/church-story/:id
exports.getChurchStoryById = async (req, res) => {
  try {
    const story = await ChurchStory.findById(req.params.id).populate(
      "language",
      "name code"
    );
    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /church-story
// Admin only
// @route   POST /api/church-story
exports.createChurchStory = async (req, res) => {
  try {
    let photoUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }

    // year and order are never taken from the client — the schema's
    // pre("validate") hook derives both from `range`.
    const story = await ChurchStory.create({
      ...sanitizeStoryBody(req.body),
      ...(photoUrl && { photo: photoUrl }),
    });

    res.status(201).json(story);
  } catch (err) {
    console.error(err);

    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0].message;
      return res.status(400).json({ message: firstError });
    }

    res.status(400).json({ message: err.message });
  }
};

// PUT /church-story/:id
// Admin only
// @route   PUT /api/church-story/:id
exports.updateChurchStory = async (req, res) => {
  try {
    const story = await ChurchStory.findById(req.params.id);

    if (!story) return res.status(404).json({ message: "Chapter not found" });

    let photoUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }

    // Assign only the safe fields, then save() — this re-runs the
    // pre("validate") hook so year/order stay in sync with range.
    Object.assign(story, sanitizeStoryBody(req.body));

    if (photoUrl) {
      story.photo = photoUrl;
    }

    await story.save();

    res.json(story);
  } catch (err) {
    console.error(err);

    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0].message;
      return res.status(400).json({ message: firstError });
    }

    res.status(400).json({ message: err.message });
  }
};

// DELETE /church-story/:id
// Admin only
// @route   DELETE /api/church-story/:id
exports.deleteChurchStory = async (req, res) => {
  try {
    const story = await ChurchStory.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json({ message: "Chapter deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};