const Media = require("../models/Media");
const cloudinary = require("../config/cloudinary");

// Upload media to Cloudinary
const uploadToCloudinary = (fileBuffer, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "media",
        resource_type: resourceType,
        // Preserve original filename/extension on raw uploads so
        // public_id reliably ends in .pdf (helps buildThumbnail below)
        use_filename: resourceType === "raw",
        unique_filename: resourceType !== "raw",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};

// Helper: build thumbnail URL depending on what got uploaded
const buildThumbnail = (result) => {
  if (!result) return "";

  // Video -> Cloudinary can grab a frame as .jpg
  if (result.resource_type === "video") {
    return result.secure_url.replace(/\.\w+$/, ".jpg");
  }

  // Old-style PDFs: uploaded as resource_type "image", format "pdf"
  // (this is how PDFs landed before we switched documents to "raw")
  if (result.resource_type === "image" && result.format === "pdf") {
    return cloudinary.url(result.public_id, {
      resource_type: "image",
      page: 1,
      format: "jpg",
      transformation: [{ width: 500, crop: "fit" }],
      version: result.version,
    });
  }

  // New-style PDFs: uploaded explicitly as resource_type "raw"
  const isRawPdf =
    result.resource_type === "raw" &&
    (result.format === "pdf" || /\.pdf$/i.test(result.public_id));

  if (isRawPdf) {
    return cloudinary.url(result.public_id, {
      resource_type: "image",
      page: 1,
      format: "jpg",
      transformation: [{ width: 500, crop: "fit" }],
      version: result.version,
    });
  }

  return "";
};

// Helper: build the correct delivery URL for a fresh upload result.
// For raw documents, force format explicitly so Cloudinary sets the
// right Content-Type, and disable forced versioning so we don't end
// up with a fake "v1" segment that 404s.
const buildMediaUrl = (result) => {
  if (result.resource_type === "raw") {
    return cloudinary.url(result.public_id, {
      resource_type: "raw",
      format: "pdf",
      force_version: false,
    });
  }
  return result.secure_url;
};

// Helper: strip empty-string refs so Mongoose doesn't choke on ObjectId cast
const cleanRef = (value) => (value === "" || value === undefined ? undefined : value);

// Helper: decide Cloudinary resource_type from the frontend's "type" field.
// Documents go up as "raw" so they aren't subject to the image-pipeline
// PDF/ZIP delivery restriction; everything else keeps auto-detection.
const resolveResourceType = (mediaType) => (mediaType === "document" ? "raw" : "auto");

// Helper: recompute mediaUrl at read-time for raw (document) records,
// so any past extension/Content-Type/version issue self-heals without
// needing to trust whatever string was saved at upload time. Requires
// publicId to have been backfilled/saved — records without it keep
// their stored mediaUrl as-is.
const withFreshUrl = (mediaDoc) => {
  const doc = mediaDoc.toObject ? mediaDoc.toObject() : mediaDoc;
  if (doc.resourceType === "raw" && doc.publicId) {
    doc.mediaUrl = cloudinary.url(doc.publicId, {
      resource_type: "raw",
      format: "pdf",
      force_version: false,
    });
  }
  return doc;
};

// GET ALL MEDIA
exports.getMedia = async (req, res) => {
  try {
    const media = await Media.find()
      .populate("author", "name")
      .populate("category", "name")
      .populate("language", "name code")
      .sort({ createdAt: -1, _id: -1 });

    res.json(media.map(withFreshUrl));
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

    res.json(withFreshUrl(media));
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
    let publicId;
    let resourceType;

    if (req.file) {
      const rType = resolveResourceType(req.body.type);
      const result = await uploadToCloudinary(req.file.buffer, rType);

      mediaUrl = buildMediaUrl(result);
      thumbnail = buildThumbnail(result);
      publicId = result.public_id;
      resourceType = result.resource_type;
    }

    const media = new Media({
      title: req.body.title,
      description: req.body.description,
      mediaType: req.body.type, // frontend sends "type", schema field is "mediaType"
      mediaUrl,
      publicId,
      resourceType,
      thumbnail,
      duration: req.body.duration,
      author: req.user.id, // from authMiddleware — decoded JWT payload uses "id"
      category: cleanRef(req.body.category), // avoids "" -> ObjectId cast error
      language: cleanRef(req.body.language),
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

    const updateData = {
      ...req.body,
      updatedAt: Date.now(),
    };

    if (req.file) {
      const rType = resolveResourceType(req.body.type);
      const result = await uploadToCloudinary(req.file.buffer, rType);

      mediaUrl = buildMediaUrl(result);
      thumbnail = buildThumbnail(result);

      updateData.mediaUrl = mediaUrl;
      updateData.thumbnail = thumbnail;
      updateData.publicId = result.public_id;
      updateData.resourceType = result.resource_type;
    }

    // Frontend sends "type", schema field is "mediaType"
    if (req.body.type !== undefined) {
      updateData.mediaType = req.body.type;
      delete updateData.type;
    }

    // Avoid "" -> ObjectId cast errors on update too
    if (req.body.category !== undefined) {
      updateData.category = cleanRef(req.body.category);
    }
    if (req.body.language !== undefined) {
      updateData.language = cleanRef(req.body.language);
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

    res.json(withFreshUrl(media));
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
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(media.map(withFreshUrl));
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
    })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(media.map(withFreshUrl));
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
    })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(media.map(withFreshUrl));
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
    })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(media.map(withFreshUrl));
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
    })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(media.map(withFreshUrl));
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};