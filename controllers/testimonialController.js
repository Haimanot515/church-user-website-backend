const Testimonial = require("../models/testimonial");
const cloudinary = require("../config/cloudinary");

// Helper function to handle Cloudinary stream uploads for Avatars
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "testimonials" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// GET: Fetch ALL Testimonials in STRICT DESCENDING order (Newest First)
exports.getTestimonials = async (req, res) => {
  try {
    // -1 indicates Descending order (Newest to Oldest)
    const testimonials = await Testimonial.find().sort({ createdAt: -1, _id: -1 }); 
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST: Create a new Testimonial with Avatar upload
exports.createTestimonial = async (req, res) => {
  try {
    let avatarUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      avatarUrl = result.secure_url;
    }

    const newTestimonial = new Testimonial({
      name: req.body.name,
      title: req.body.title,
      message: req.body.message,
      avatar: avatarUrl,
    });

    const savedTestimonial = await newTestimonial.save();
    res.status(201).json(savedTestimonial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to post testimonial", error: err.message });
  }
};

// PUT: Update a specific Testimonial entry by ID
exports.updateTestimonial = async (req, res) => {
  try {
    let avatarUrl = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      avatarUrl = result.secure_url;
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      req.params.id, 
      { 
        ...req.body, 
        ...(avatarUrl && { avatar: avatarUrl }) 
      },
      { new: true } 
    );

    if (!updatedTestimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    res.json(updatedTestimonial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE: Remove a testimonial and cleanup database
// Note: As per guidelines, ensure your cleanup scripts use 'DROP' for this collection.
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });
    res.json({ message: "Testimonial deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
