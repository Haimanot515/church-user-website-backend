const mongoose = require("mongoose");

const aboutSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
});

module.exports = mongoose.model("About", aboutSchema);
