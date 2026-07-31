const About = require("../models/Aboutchurchhero");
const cloudinary = require("../config/cloudinary");

// Helper function to handle Cloudinary stream uploads
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
    const about = await About.find({ language: req.language })
      .populate("language", "name code")
      .sort({ createdAt: -1, _id: -1 });
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

    const newAbout = new About({
      title: req.body.title,
      churchLeader: req.body.churchLeader,
      description: req.body.description,
      language: req.body.language,
      image: imageUrl,
    });

    const savedAbout = await newAbout.save();
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
    const updateData = {};

    // Map body fields — only set fields that were actually provided
    const fields = ["title", "churchLeader", "description", "language"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "null") {
        updateData[field] = req.body[field];
      }
    });

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      updateData.image = result.secure_url;
    }

    // This updates a specific entry using its ID (e.g., 6982ff326b288509e3790cfc)
    const about = await About.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

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
    const about = await About.findByIdAndDelete(req.params.id);
    if (!about) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "About entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};