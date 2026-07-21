const Media = require("../models/Media");
const cloudinary = require("../config/cloudinary");

// Upload media to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "media",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};

// GET ALL MEDIA
exports.getMedia = async (req, res) => {
  try {
    const media = await Media.find()
      .populate("author", "name")
      .populate("category", "name")
      .populate("language", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(media);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE MEDIA
exports.getMediaById = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate("author", "name")
      .populate("category", "name")
      .populate("language", "name code");

    if (!media) {
      return res.status(404).json({
        message: "Media not found",
      });
    }

    res.json(media);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// CREATE MEDIA
exports.createMedia = async (req, res) => {
  try {
    let mediaUrl = "";
    let thumbnail = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);

      mediaUrl = result.secure_url;

      if (result.resource_type === "video") {
        thumbnail = result.secure_url.replace(/\.\w+$/, ".jpg");
      }
    }

    const media = new Media({
      title: req.body.title,
      description: req.body.description,
      mediaType: req.body.type, // frontend sends "type", schema field is "mediaType"
      mediaUrl,
      thumbnail,
      duration: req.body.duration,
      author: req.user.id, // from authMiddleware — decoded JWT payload uses "id"
      category: req.body.category,
      language: req.body.language,
      isTrending: req.body.isTrending === "true",
      isRecommended: req.body.isRecommended === "true",
      isFeatured: req.body.isFeatured === "true",
      status: req.body.status || "draft",
      publishedAt:
        req.body.status === "published"
          ? Date.now()
          : null,
    });

    const savedMedia = await media.save();

    res.status(201).json(savedMedia);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to create media",
      error: err.message,
    });
  }
};

// UPDATE MEDIA
exports.updateMedia = async (req, res) => {
  try {
    let mediaUrl = "";
    let thumbnail = "";

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);

      mediaUrl = result.secure_url;

      if (result.resource_type === "video") {
        thumbnail = result.secure_url.replace(/\.\w+$/, ".jpg");
      }
    }

    const updateData = {
      ...req.body,
      ...(mediaUrl && { mediaUrl }),
      ...(thumbnail && { thumbnail }),
      updatedAt: Date.now(),
    };

    // Frontend sends "type", schema field is "mediaType"
    if (req.body.type !== undefined) {
      updateData.mediaType = req.body.type;
      delete updateData.type;
    }

    // Convert boolean fields from FormData strings if present
    if (req.body.isTrending !== undefined) {
      updateData.isTrending = req.body.isTrending === "true";
    }

    if (req.body.isRecommended !== undefined) {
      updateData.isRecommended = req.body.isRecommended === "true";
    }

    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === "true";
    }

    const media = await Media.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
      }
    );

    if (!media) {
      return res.status(404).json({
        message: "Media not found",
      });
    }

    res.json(media);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// DELETE MEDIA
exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findByIdAndDelete(req.params.id);

    if (!media) {
      return res.status(404).json({
        message: "Media not found",
      });
    }

    res.json({
      message: "Media deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// GET LATEST MEDIA
exports.getLatestMedia = async (req, res) => {
  try {
    const media = await Media.find({
      status: "published",
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(media);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// GET TRENDING MEDIA
exports.getTrendingMedia = async (req, res) => {
  try {
    const media = await Media.find({
      status: "published",
      isTrending: true,
    }).sort({ createdAt: -1 });

    res.json(media);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// GET FEATURED MEDIA
exports.getFeaturedMedia = async (req, res) => {
  try {
    const media = await Media.find({
      status: "published",
      isFeatured: true,
    }).sort({ createdAt: -1 });

    res.json(media);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// GET RECOMMENDED MEDIA
exports.getRecommendedMedia = async (req, res) => {
  try {
    const media = await Media.find({
      status: "published",
      isRecommended: true,
    }).sort({ createdAt: -1 });

    res.json(media);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// GET MEDIA BY TYPE
exports.getMediaByType = async (req, res) => {
  try {
    const media = await Media.find({
      status: "published",
      mediaType: req.params.type,
    }).sort({ createdAt: -1 });

    res.json(media);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};