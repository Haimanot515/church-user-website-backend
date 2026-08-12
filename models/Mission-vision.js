const mongoose = require("mongoose");

const missionVisionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mission", "vision"],
      required: true,
    },
    title: { type: String, required: true }, // e.g. "Our Mission"
    desc: { type: String, required: true },
    order: { type: Number, default: 0 },

    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MissionVision", missionVisionSchema);