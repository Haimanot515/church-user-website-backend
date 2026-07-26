const mongoose = require("mongoose");

const aboutSchema = new mongoose.Schema({
  title: String,
  churchLeader: String,
  description: String,
  image: String,
});

module.exports = mongoose.model("About", aboutSchema);