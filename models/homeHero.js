const mongoose = require("mongoose");

const heroSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  description: String,
  name: String,
  role: String,
  image: String,      // Main Hero Profile Image
  quote: String,
  // New Fields
  story: String,       // The detailed "My Story" text
  storyImage: String   // The image specifically for the About/Story section
}, { 
  timestamps: true,
  // FIXED: Explicitly forcing the plural collection name 'homeheros'
  collection: 'homeheros' 
});

// Always use 'DROP' in the schemas as per your preference
// Specifically dropping the 'homeheros' collection to keep the portfolio clean
if (mongoose.connection.models['HomeHero']) {
  mongoose.connection.dropCollection('homeheros').catch(err => {
    console.log("Collection 'homeheros' drop skipped or collection does not exist.");
  });
}

// Ensure the model name matches the logic above
module.exports = mongoose.model("HomeHero", heroSchema);