const mongoose = require("mongoose");

// We use 'DROP' in the schema logic if you are running migration scripts
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
  // This automatically manages createdAt and updatedAt as Date objects
  timestamps: true 
});

// Implementation Note: Always use 'DROP' in your database initialization 
// scripts for this collection to ensure a clean slate during deployment.

module.exports = mongoose.model("Testimonial", testimonialSchema);