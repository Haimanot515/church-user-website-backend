const mediaService = require("../services/mediaService");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "media",
        resource_type: resourceType,
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

const buildThumbnail = (result) => {
  if (!result) return "";
  if (result.resource_type === "video") {
    return result.secure_url.replace(/\.\w+$/, ".jpg");
  }
  if (result.resource_type === "image" && result.format === "pdf") {
    return cloudinary.url(result.public_id, {
      resource_type: "image",
      page: 1,
      format: "jpg",
      transformation: [{ width: 500, crop: "fit" }],
      version: result.version,
    });
  }
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

const buildMediaUrl = (result) => {
  if (result.resource_type === "raw") {
    const alreadyHasExt = /\.\w+$/.test(result.public_id);
    return cloudinary.url(result.public_id, {
      resource_type: "raw",
      ...(alreadyHasExt ? {} : { format: "pdf" }),
      force_version: false,
    });
  }
  return result.secure_url;
};

const cleanRef = (value) => (value === "" || value === undefined ? undefined : value);

const resolveResourceType = (mediaType) => (mediaType === "document" ? "raw" : "auto");

// Helper: recompute mediaUrl at read-time for raw (document) records.
// Prisma results are plain objects already, so no .toObject() needed.
const withFreshUrl = (mediaDoc) => {
  const doc = { ...mediaDoc };
  if (doc.resourceType === "raw" && doc.publicId) {
    const alreadyHasExt = /\.\w+$/.test(doc.publicId);
    doc.mediaUrl = cloudinary.url(doc.publicId, {
      resource_type: "raw",
      ...(alreadyHasExt ? {} : { format: "pdf" }),
      force_version: false,
    });
  }
  return doc;
};

// GET ALL MEDIA
exports.getMedia = async (req, res) => {
  try {
    const media = await mediaService.getMedia();
    res.json(media.map(withFreshUrl));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE MEDIA
exports.getMediaById = async (req, res) => {
  try {
    const media = await mediaService.getMediaById(req.params.id);
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }
    res.json(withFreshUrl(media));
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    const savedMedia = await mediaService.createMedia({
      title: req.body.title,
      description: req.body.description,
      mediaType: req.body.type,
      mediaUrl,
      publicId,
      resourceType,
      thumbnail,
      duration: req.body.duration,
      author: req.user.id,
      category: cleanRef(req.body.category),
      language: cleanRef(req.body.language) || req.language,
      isTrending: req.body.isTrending === "true",
      isRecommended: req.body.isRecommended === "true",
      isFeatured: req.body.isFeatured === "true",
      status: req.body.status || "draft",
      publishedAt: req.body.status === "published" ? new Date() : null,
    });
    res.status(201).json(savedMedia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create media", error: err.message });
  }
};

// UPDATE MEDIA
exports.updateMedia = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      const rType = resolveResourceType(req.body.type);
      const result = await uploadToCloudinary(req.file.buffer, rType);
      updateData.mediaUrl = buildMediaUrl(result);
      updateData.thumbnail = buildThumbnail(result);
      updateData.publicId = result.public_id;
      updateData.resourceType = result.resource_type;
    }

    if (req.body.type !== undefined) {
      updateData.mediaType = req.body.type;
      delete updateData.type;
    }
    if (req.body.category !== undefined) {
      updateData.category = cleanRef(req.body.category);
    }
    if (req.body.language !== undefined) {
      updateData.language = cleanRef(req.body.language);
    }
    if (req.body.isTrending !== undefined) {
      updateData.isTrending = req.body.isTrending === "true";
    }
    if (req.body.isRecommended !== undefined) {
      updateData.isRecommended = req.body.isRecommended === "true";
    }
    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === "true";
    }

    const media = await mediaService.updateMedia(req.params.id, updateData);
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }
    res.json(withFreshUrl(media));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE MEDIA
exports.deleteMedia = async (req, res) => {
  try {
    const media = await mediaService.deleteMedia(req.params.id);
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }
    res.json({ message: "Media deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET LATEST MEDIA
exports.getLatestMedia = async (req, res) => {
  try {
    const media = await mediaService.getLatestMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET TRENDING MEDIA
exports.getTrendingMedia = async (req, res) => {
  try {
    const media = await mediaService.getTrendingMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET FEATURED MEDIA
exports.getFeaturedMedia = async (req, res) => {
  try {
    const media = await mediaService.getFeaturedMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET RECOMMENDED MEDIA
exports.getRecommendedMedia = async (req, res) => {
  try {
    const media = await mediaService.getRecommendedMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET MEDIA BY TYPE
exports.getMediaByType = async (req, res) => {
  try {
    const media = await mediaService.getMediaByType(req.params.type, req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
