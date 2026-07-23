const mongoose = require("mongoose");

const churchSchema = new mongoose.Schema(
  {
    churchName: {
      type: String,
      required: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
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

    isFeatured: {
      type: Boolean,
      default: false,
    },

  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model("Church", churchSchema);