const mongoose = require("mongoose");

const skillHeroSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  description: String,
  name: String,
  role: String,
  image: String,        // Main Hero Image for Skills Page
  quote: String,
  story: String,        // Detailed text if needed for the skills section
  storyImage: String    // Secondary image for the skills layout
}, { timestamps: true });

// Always use 'DROP' in the schemas as per your preference
// This ensures the 'skillheros' collection is cleared if the model is re-compiled
if (mongoose.connection.models['SkillHero']) {
  mongoose.connection.dropCollection('skillheros').catch(err => {
    console.log("SkillHero collection drop skipped or does not exist.");
  });
}

module.exports = mongoose.model("SkillHero", skillHeroSchema);