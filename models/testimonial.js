const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true, // e.g., "Senior Cloud Architect"
  },
  message: {
    type: String,
    required: true,
  },
  avatar: {
    type: String, // URL to the image
    default: ""
  },
}, {
  timestamps: true
});

module.exports = mongoose.model("Testimonial", testimonialSchema);