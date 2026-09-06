const churchStoryService = require("../services/churchStoryService");
const cloudinary = require("../config/cloudinary");

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
// @route   GET /api/church-story
exports.getChurchStories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { stories, total } = await churchStoryService.getChurchStories(req.language, {
      skip: (page - 1) * limit,
      take: limit,
    });
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
// @route   GET /api/church-story/:id
exports.getChurchStoryById = async (req, res) => {
  try {
    const story = await churchStoryService.getChurchStoryById(req.params.id);
    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json(story);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /church-story
// @route   POST /api/church-story
exports.createChurchStory = async (req, res) => {
  try {
    let photoUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }
    const story = await churchStoryService.createChurchStory(sanitizeStoryBody(req.body), photoUrl);
    res.status(201).json(story);
  } catch (err) {
    console.error(err);
    // Original checked err.name === "ValidationError" (Mongoose-specific).
    // The service now throws a plain Error with isValidationError: true
    // for the same "range must include a 4-digit year" case, so the same
    // 400 response is produced without depending on Mongoose's error shape.
    if (err.isValidationError) {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

// PUT /church-story/:id
// @route   PUT /api/church-story/:id
exports.updateChurchStory = async (req, res) => {
  try {
    let photoUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }
    const story = await churchStoryService.updateChurchStory(req.params.id, sanitizeStoryBody(req.body), photoUrl);
    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json(story);
  } catch (err) {
    console.error(err);
    if (err.isValidationError) {
      return res.status(400).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

// DELETE /church-story/:id
// @route   DELETE /api/church-story/:id
exports.deleteChurchStory = async (req, res) => {
  try {
    const story = await churchStoryService.deleteChurchStory(req.params.id);
    if (!story) return res.status(404).json({ message: "Chapter not found" });
    res.json({ message: "Chapter deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
