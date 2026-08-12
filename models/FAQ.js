const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: {
      type: String,
      enum: ["Information", "Faith", "Contact"],
      required: true,
    },
    order: { type: Number, default: 0 }, // controls display order within a category

    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faq", faqSchema);