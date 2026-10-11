const mediaService = require("../services/mediaService");
const { hasPermission } = require("../utils/access");
const { P } = require("../config/permissions");
const cloudinary = require("../config/cloudinary");
const sendError = require("../utils/sendError");
const pick = require("../utils/pick");

const isAdmin = (req) => hasPermission(req.user, P.MEDIA_MANAGE);

const path = require("path");

const uploadToCloudinary = (fileBuffer, resourceType = "auto", originalName = "") => {
  const options = { folder: "media", resource_type: resourceType };

  if (resourceType === "raw") {
    const ext = path.extname(originalName) || ".pdf";
    const base =
      path
        .basename(originalName, ext)
        .replace(/[^\w-]+/g, "-")
        .slice(0, 60) || "document";
    options.public_id = base + "-" + Date.now() + ext;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
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
      secure: true,
      page: 1,
      format: "jpg",
      transformation: [{ width: 500, crop: "fit" }],
      version: result.version,
    });
  }
  const isRawPdf =
    result.resource_type === "raw" && (result.format === "pdf" || /\.pdf$/i.test(result.public_id));
  if (isRawPdf) {
    return cloudinary.url(result.public_id, {
      resource_type: "image",
      secure: true,
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

// pdf-as-image: PDFs are stored as Cloudinary "image" assets so page 1 can be rendered as the cover
const resolveResourceType = (mediaType) => (mediaType === "document" ? "image" : "auto");

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
    const media = await mediaService.getMedia({ includeDrafts: isAdmin(req) });
    res.json(media.map(withFreshUrl));
  } catch (err) {
    sendError(res, err);
  }
};

// GET SINGLE MEDIA
exports.getMediaById = async (req, res) => {
  try {
    const media = await mediaService.getMediaById(req.params.id);
    // Drafts are only visible to admins.
    if (!media || (media.status !== "published" && !isAdmin(req))) {
      return res.status(404).json({ message: "Media not found" });
    }
    res.json(withFreshUrl(media));
  } catch (err) {
    sendError(res, err);
  }
};

// optional-cover: an admin may upload a cover image; otherwise page 1 of the PDF is used.
// Works with multer .single() (req.file) and .fields()/.any() (req.files).
const COVER_FIELDS = ["cover", "coverImage", "thumbnail"];
const getUploads = (req) => {
  let file = req.file;
  let cover;
  const f = req.files;
  if (f) {
    const all = Array.isArray(f) ? f : Object.values(f).flat();
    cover = all.find((x) => COVER_FIELDS.includes(x.fieldname));
    file = all.find((x) => !COVER_FIELDS.includes(x.fieldname)) || file;
  }
  if (file && COVER_FIELDS.includes(file.fieldname)) {
    cover = file;
    file = undefined;
  }
  return { file, cover };
};

const uploadCover = async (coverFile) => {
  const result = await uploadToCloudinary(coverFile.buffer, "image", coverFile.originalname);
  return result.secure_url;
};

// CREATE MEDIA
exports.createMedia = async (req, res) => {
  try {
    let mediaUrl = "";
    let thumbnail = "";
    let publicId;
    let resourceType;

    const { file, cover } = getUploads(req);

    if (file) {
      const rType = resolveResourceType(req.body.type);
      const result = await uploadToCloudinary(file.buffer, rType, file.originalname);
      mediaUrl = buildMediaUrl(result);
      thumbnail = buildThumbnail(result);
      publicId = result.public_id;
      resourceType = result.resource_type;
    }

    // Admin-provided cover wins; otherwise the auto first-page thumbnail above is kept.
    if (cover) thumbnail = await uploadCover(cover);

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
      isTrending: req.body.isTrending === true || req.body.isTrending === "true",
      isRecommended: req.body.isRecommended === true || req.body.isRecommended === "true",
      isFeatured: req.body.isFeatured === true || req.body.isFeatured === "true",
      status: req.body.status || "draft",
      publishedAt: req.body.status === "published" ? new Date() : null,
    });
    res.status(201).json(savedMedia);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to create media");
  }
};

// UPDATE MEDIA
exports.updateMedia = async (req, res) => {
  try {
    // Whitelist: no author/id/timestamps/publicId from the client.
    const updateData = pick(req.body, [
      "title",
      "description",
      "duration",
      "status",
      "category",
      "language",
    ]);

    const { file, cover } = getUploads(req);

    if (file) {
      const rType = resolveResourceType(req.body.type);
      const result = await uploadToCloudinary(file.buffer, rType, file.originalname);
      updateData.mediaUrl = buildMediaUrl(result);
      updateData.thumbnail = buildThumbnail(result);
      updateData.publicId = result.public_id;
      updateData.resourceType = result.resource_type;

      // Replacing only the PDF keeps a custom cover the admin uploaded earlier.
      if (!cover) {
        const existing = await mediaService.getMediaById(req.params.id);
        if (existing && existing.thumbnail && !existing.thumbnail.includes("pg_1")) {
          delete updateData.thumbnail;
        }
      }
    }

    if (cover) {
      updateData.thumbnail = await uploadCover(cover);
    } else if (req.body.removeCover === true || req.body.removeCover === "true") {
      // Back to the automatic first-page cover.
      const existing = await mediaService.getMediaById(req.params.id);
      const pid = updateData.publicId || (existing && existing.publicId);
      if (pid) {
        updateData.thumbnail = buildThumbnail({
          resource_type: "image",
          format: "pdf",
          public_id: pid,
          version: existing && existing.version,
        });
      }
    }

    if (req.body.type !== undefined) {
      updateData.mediaType = req.body.type;
    }
    if (req.body.category !== undefined) {
      updateData.category = cleanRef(req.body.category);
    }
    if (req.body.language !== undefined) {
      updateData.language = cleanRef(req.body.language);
    }
    if (req.body.isTrending !== undefined) {
      updateData.isTrending = req.body.isTrending === true || req.body.isTrending === "true";
    }
    if (req.body.isRecommended !== undefined) {
      updateData.isRecommended =
        req.body.isRecommended === true || req.body.isRecommended === "true";
    }
    if (req.body.isFeatured !== undefined) {
      updateData.isFeatured = req.body.isFeatured === true || req.body.isFeatured === "true";
    }

    const media = await mediaService.updateMedia(req.params.id, updateData);
    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }
    res.json(withFreshUrl(media));
  } catch (err) {
    sendError(res, err);
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
    sendError(res, err);
  }
};

// GET LATEST MEDIA
exports.getLatestMedia = async (req, res) => {
  try {
    const media = await mediaService.getLatestMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    sendError(res, err);
  }
};

// GET TRENDING MEDIA
exports.getTrendingMedia = async (req, res) => {
  try {
    const media = await mediaService.getTrendingMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    sendError(res, err);
  }
};

// GET FEATURED MEDIA
exports.getFeaturedMedia = async (req, res) => {
  try {
    const media = await mediaService.getFeaturedMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    sendError(res, err);
  }
};

// GET RECOMMENDED MEDIA
exports.getRecommendedMedia = async (req, res) => {
  try {
    const media = await mediaService.getRecommendedMedia(req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    sendError(res, err);
  }
};

// GET MEDIA BY TYPE
exports.getMediaByType = async (req, res) => {
  try {
    const media = await mediaService.getMediaByType(req.params.type, req.language);
    res.json(media.map(withFreshUrl));
  } catch (err) {
    sendError(res, err);
  }
};
