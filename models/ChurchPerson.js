const mongoose = require("mongoose");

const churchPersonSchema = new mongoose.Schema({
  name: String,
  photos: [String],
  title: String,
  description: String,
  role: String,
  message: String,
  category: {
    type: String,
    enum: ["leader", "specialThanks", "testimony"],
  },
  rank: {
    type: String,
    enum: [
      "patriarch",
      "archbishop",
      "bishop",
      "archpriest",
      "priest",
      "deacon",
      "subdeacon",
      "elder",
      "member",
    ],
  },
  rankOrder: {
    type: Number,
    default: 0, // lower number = higher precedence, used for sorting by hierarchy
  },
  language: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Language",
    required: true,
  },
});

module.exports = mongoose.model("ChurchPerson", churchPersonSchema);