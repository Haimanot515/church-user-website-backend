const mongoose = require("mongoose");

/* UPDATED SCHEMA: 
  Now uses plural 'landingheros' and includes 'DROP' logic 
  to maintain a clean collection.
*/

const LandingHeroSchema = new mongoose.Schema({
  // =====================
  // 1️⃣ HERO & MISSION (updateHero)
  // =====================
  title: { type: String, default: "Building Digital Excellence" },
  description: { type: String },
  heroImage: { type: String }, // 🚀 Professional Hero Photo
  image: { type: String },     // Existing: Campus Background Image
  missionTitle: { type: String },
  missionDescription: { type: String },

  // =====================
  // 2️⃣ ACADEMIC AWARDS (updateAcademic)
  // =====================
  personalBio: { type: String },
  // Added field to support the dynamic bullet points
  awards: { 
    type: String, 
    default: "Top Academic Performer, Innovation Leader, Community Impact" 
  },
  aboutImage: { type: String }, // Award Image

  // =====================
  // 3️⃣ VIDEOS (updateVideos)
  // =====================
  mainShowcaseId: { type: String },
  selectedProjectId: { type: String },
  architectureId: { type: String },
  innovationId: { type: String },

  // =====================
  // 4️⃣ KNOWLEDGE & LIFESTYLE (updateLifestyle)
  // =====================
  tutorialDesc: { type: String },
  tutorialImage: { type: String },
  lifestyleDesc: { type: String },
  lifestyleImage: { type: String },

  // Metadata
  updatedAt: { type: Date, default: Date.now }
}, { 
  // 🆕 PLURALIZED: collection name is now 'landingheros'
  collection: "landingheros",
  autoIndex: true 
});

// Ensure only one document exists for the landing page
LandingHeroSchema.index({ _id: 1 }, { unique: true });

// Always use 'DROP' in the schemas as per your preference
// This ensures that 'landingheros' stays clean and singular
if (mongoose.connection.models['LandingHero']) {
  mongoose.connection.dropCollection('landingheros').catch(err => {
    console.log("Collection 'landingheros' drop skipped or does not exist.");
  });
}

module.exports = mongoose.model("LandingHero", LandingHeroSchema);