const mongoose = require("mongoose");

const projectHeroSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  description: String,
  name: String,
  role: String,
  image: String,        // Main Hero Image for Projects Page
  quote: String,
  story: String,        // Detailed story/background for the portfolio section
  storyImage: String    // Secondary image for the projects layout
}, { timestamps: true });

// Always use 'DROP' in the schemas as per your preference
// This ensures the 'projectheros' collection is cleared if the model is re-compiled
if (mongoose.connection.models['ProjectHero']) {
  mongoose.connection.dropCollection('projectheros').catch(err => {
    console.log("ProjectHero collection drop skipped or does not exist.");
  });
}

module.exports = mongoose.model("ProjectHero", projectHeroSchema);