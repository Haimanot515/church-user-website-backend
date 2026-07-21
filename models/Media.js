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

  thumbnail: {
    type: String,
  },

  mediaType: {
    type: String,
    enum: ["photo", "video", "audio"],
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