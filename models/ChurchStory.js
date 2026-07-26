const mongoose = require("mongoose");

const churchStorySchema = new mongoose.Schema(
  {
    year: { type: String, required: true },
    range: { type: String, required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    leader: { type: String },
    leaderRole: { type: String },
    servedBy: { type: String },
    photo: { type: String },
    order: { type: Number, default: 0 }, // controls display order in "Our Church Story"
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChurchStory", churchStorySchema);