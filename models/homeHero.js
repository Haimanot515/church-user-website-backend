const mongoose = require("mongoose");

const heroSchema = new mongoose.Schema(
  {
    title: String,
    subtitle: String,
    description: String,
    name: String,
    role: String,
    image: String, // Main Hero Profile Image
    quote: String,
    story: String, // The detailed "My Story" text
    storyImage: String, // The image specifically for the About/Story section

    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "homeheros",
  }
);

module.exports = mongoose.model("HomeHero", heroSchema);