const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  language: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Language",
    required: true,
  },

  description: String,

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

// same name allowed across different languages,
// but not duplicated within the same language
categorySchema.index({ name: 1, language: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);