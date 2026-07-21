const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },


  imageUrl: {
    type: String,
  },


  schedule: {
    type: String,
    required: true,
  },


  category: {
    type: String,
    enum: [
      "Worship",
      "Teaching",
      "Prayer",
      "Music",
      "Youth",
      "Ministry",
      "Outreach",
      "Other"
    ],
    default: "Other",
  },


  location: {
    type: String,
    default: "",
  },


  isFeatured: {
    type: Boolean,
    default: false,
  },


  status: {
    type: String,
    enum: [
      "active",
      "inactive"
    ],
    default: "active",
  },


  createdAt: {
    type: Date,
    default: Date.now,
  },


  updatedAt: {
    type: Date,
    default: Date.now,
  }

});


module.exports = mongoose.model("Service", serviceSchema);