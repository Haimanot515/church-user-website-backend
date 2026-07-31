const mongoose = require("mongoose");

const aboutSchema = new mongoose.Schema(
  {
    title: String,
    churchLeader: String,
    description: String,
    image: String,

    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("About", aboutSchema);