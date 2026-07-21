const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  owner: {
    type: String, // Or mongoose.Schema.Types.ObjectId if referencing a User model
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  /* ADDED CATEGORY */
  category: {
    type: String,
    required: true,
    enum: [
      "All", "Full-Stack", "Frontend", "Backend", "Mobile App", 
      "SaaS", "AI/ML", "UI/UX", "Blockchain", "Cybersecurity", 
      "Cloud Native", "DevOps", "Data Science", "E-commerce", 
      "API Design", "Open Source", "Automation"
    ],
    default: "All"
  },
  image: {
    type: String,
    default: ""
  },
  // Unified naming convention to match your controller
  githubLink: {
    type: String,
    default: ""
  },
  liveLink: {
    type: String,
    default: ""
  },
  demoLink: {
    type: String,
    default: ""
  },
  docsLink: {
    type: String,
    default: ""
  },
  techStack: {
    type: [String], // Array of strings for badges (React, Node, etc.)
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Project", projectSchema);
