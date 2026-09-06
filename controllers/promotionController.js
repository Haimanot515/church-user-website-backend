const promotionService = require("../services/promotionService");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "promotion" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

exports.getLatestPromotion = async (req, res) => {
  try {
    const promotion = await promotionService.getLatestPromotion(req.language);
    if (!promotion) {
      return res.status(404).json({ message: "No promotion found" });
    }
    res.json(promotion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET: Fetch ALL Promotions for the current language (Newest First)
exports.getPromotion = async (req, res) => {
  try {
    const promotions = await promotionService.getPromotion(req.language);
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET: Fetch a single Promotion by ID
exports.getPromotionById = async (req, res) => {
  try {
    const promotion = await promotionService.getPromotionById(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    res.json(promotion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST: Create a new Promotion
exports.createPromotion = async (req, res) => {
  try {
    let photoUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }
    const savedPromotion = await promotionService.createPromotion({
      title: req.body.title,
      description: req.body.description,
      language: req.body.language,
      photo: photoUrl,
    });
    res.status(201).json(savedPromotion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create Promotion section", error: err.message });
  }
};

// PUT: Update Promotion by ID
exports.updatePromotion = async (req, res) => {
  try {
    let photoUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      photoUrl = result.secure_url;
    }
    const promotion = await promotionService.updatePromotion(req.params.id, req.body, photoUrl);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    res.json(promotion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE: Delete Promotion by ID
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await promotionService.deletePromotion(req.params.id);
    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }
    res.json({ message: "Promotion deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
