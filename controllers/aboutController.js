const About = require("../models/About");
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

// GET: Fetch ALL About entries in STRICT DESCENDING order (Newest First)
exports.getAbout = async (req, res) => {
  try {
    // We sort by createdAt: -1 for the timestamp
    // We also sort by _id: -1 as a fallback to ensure the newest IDs always appear first
    const about = await About.find().sort({ createdAt: -1, _id: -1 }); 
    res.json(about);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST: Create a new About entry
exports.createAbout = async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const newAbout = new About({
      title: req.body.title,
      description: req.body.description,
      image: imageUrl,
    });

    const savedAbout = await newAbout.save();
    res.status(201).json(savedAbout);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create About section", error: err.message });
  }
};

// PUT: Update a specific About entry by ID
exports.updateAbout = async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    // This updates a specific entry using its ID (e.g., 6982ff326b288509e3790cfc)
    const about = await About.findByIdAndUpdate(
      req.params.id, 
      { 
        ...req.body, 
        ...(imageUrl && { image: imageUrl }) 
      },
      { new: true } 
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

// DELETE: (Optional but recommended) Delete an entry by ID
exports.deleteAbout = async (req, res) => {
  try {
    const about = await About.findByIdAndDelete(req.params.id);
    if (!about) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "About entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};