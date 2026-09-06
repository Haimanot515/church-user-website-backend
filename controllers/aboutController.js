const aboutService = require("../services/aboutService");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "about" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// @desc    Get About entries for the current language (Newest First)
// @route   GET /api/about
exports.getAbout = async (req, res) => {
  try {
    const about = await aboutService.getAbout(req.language);
    res.json(about);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new About entry
// @route   POST /api/about
exports.createAbout = async (req, res) => {
  try {
    let imageUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }
    const savedAbout = await aboutService.createAbout({
      title: req.body.title,
      churchLeader: req.body.churchLeader,
      description: req.body.description,
      language: req.body.language,
      image: imageUrl,
    });
    res.status(201).json(savedAbout);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create About section", error: err.message });
  }
};

// @desc    Update a specific About entry by ID
// @route   PUT /api/about/:id
exports.updateAbout = async (req, res) => {
  try {
    let imageUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }
    const about = await aboutService.updateAbout(req.params.id, req.body, imageUrl);
    if (!about) {
      return res.status(404).json({ message: "Entry not found" });
    }
    res.json(about);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a specific About entry by ID
// @route   DELETE /api/about/:id
exports.deleteAbout = async (req, res) => {
  try {
    const about = await aboutService.deleteAbout(req.params.id);
    if (!about) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "About entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
