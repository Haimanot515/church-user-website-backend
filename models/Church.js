const mongoose = require("mongoose");

const churchSchema = new mongoose.Schema(
  {
    churchName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    history: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    serviceDays: {
      type: String,
      default: "",
    },

    serviceTime: {
      type: String,
      default: "",
    },

    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model("Church", churchSchema);