const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
  name: String,
  level: String,
  /* ADDED CATEGORY */
  category: {
    type: String,
    enum: ["Programming Languages", "Cybersecurity", "Frontend", "Backend", "AI", "DevOps", "Mobile"],
    default: "Programming Languages"
  }
});

module.exports = mongoose.model("Skill", skillSchema);
