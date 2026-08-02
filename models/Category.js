const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  // language-independent key that links "Travel" / "Viaggi" / "ጉዞ"
  // together as the same logical category across languages
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
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

// each slug can only appear once per language,
// but the same slug repeats across languages (that's the point)
categorySchema.index({ slug: 1, language: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);