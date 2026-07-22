const Promotion = require("../models/Promotion");
const cloudinary = require("../config/cloudinary");

// Helper function to handle Cloudinary stream uploads
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
    const promotion = await Promotion.findOne()
      .sort({ createdAt: -1, _id: -1 });

    if (!promotion) {
      return res.status(404).json({
        message: "No promotion found"
      });
    }

    res.json(promotion);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};
// GET: Fetch ALL Promotions (Newest First)
exports.getPromotion = async (req, res) => {
  try {
    const promotions = await Promotion.find()
      .sort({ createdAt: -1, _id: -1 });

    res.json(promotions);

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


    const newPromotion = new Promotion({
      title: req.body.title,
      description: req.body.description,
      photo: photoUrl,
    });


    const savedPromotion = await newPromotion.save();

    res.status(201).json(savedPromotion);


  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to create Promotion section",
      error: err.message
    });
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


    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        ...(photoUrl && { photo: photoUrl })
      },
      {
        new: true
      }
    );


    if (!promotion) {
      return res.status(404).json({
        message: "Promotion not found"
      });
    }


    res.json(promotion);


  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });
  }
};



// DELETE: Delete Promotion by ID
exports.deletePromotion = async (req, res) => {

  try {

    const promotion = await Promotion.findByIdAndDelete(req.params.id);


    if (!promotion) {
      return res.status(404).json({
        message: "Promotion not found"
      });
    }


    res.json({
      message: "Promotion deleted successfully"
    });


  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};