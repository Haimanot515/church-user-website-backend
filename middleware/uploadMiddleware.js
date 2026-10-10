const multer = require("multer");

const MB = 1024 * 1024;
const IMAGE_MAX_MB = Number(process.env.MAX_IMAGE_UPLOAD_MB) || 10;
const MEDIA_MAX_MB = Number(process.env.MAX_MEDIA_UPLOAD_MB) || 50;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const MEDIA_TYPES = new Set([
  ...IMAGE_TYPES,
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/aac",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const filterFor = (allowed) => (req, file, cb) => {
  if (allowed.has(file.mimetype)) return cb(null, true);
  const err = new Error(`Unsupported file type: ${file.mimetype}`);
  err.code = "UNSUPPORTED_FILE_TYPE";
  cb(err);
};

// Default uploader: images only, small files.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: IMAGE_MAX_MB * MB, files: 10, fields: 50 },
  fileFilter: filterFor(IMAGE_TYPES),
});

// Media library uploader: images, video, audio and documents, larger cap.
upload.media = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_MB * MB, files: 1, fields: 50 },
  fileFilter: filterFor(MEDIA_TYPES),
});

module.exports = upload;
