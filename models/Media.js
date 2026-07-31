const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  mediaUrl: {
    type: String,
    required: true,
  },

  // Cloudinary's raw identifier for the asset (e.g. "media/abc123").
  // Only set for documents; lets us regenerate a correct delivery URL
  // at read-time instead of trusting a possibly-stale mediaUrl string.
  publicId: {
    type: String,
  },

  // Cloudinary's resource_type for this asset: "image" for photos/old
  // PDFs, "video" for videos, "raw" for new documents.
  resourceType: {
    type: String,
    enum: ["image", "video", "raw"],
  },

  thumbnail: {
    type: String,
  },

  mediaType: {
    type: String,
    enum: ["photo", "video", "audio", "document"],
    required: true,
  },

  duration: {
    type: String,
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },

  language: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Language",
    required: true,
  },

  isTrending: {
    type: Boolean,
    default: false,
  },

  isFeatured: {
    type: Boolean,
    default: false,
  },

  isRecommended: {
    type: Boolean,
    default: false,
  },

  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },

  publishedAt: {
    type: Date,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Media", mediaSchema);