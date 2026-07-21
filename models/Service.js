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

  day: {
    type: String,
    required: true,
  },

  time: {
    type: String,
    required: true,
  },

  schedule: {
    type: String,
    // no longer required directly — auto-generated below from day + time
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

// Auto-generate `schedule` from day + time before saving,
// and keep `updatedAt` current on every save.
serviceSchema.pre("save", function (next) {
  this.schedule = `${this.day}, ${this.time}`;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Service", serviceSchema);