const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  content: {
    type: String,
    required: true,
  },

  imageUrl: String,

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
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

module.exports = mongoose.model("Post", postSchema);