const router = require("express").Router();

const protect = require("../middleware/protect");
const { P } = require("../config/permissions");

const {
  getLanguages,
  getLanguageById,
  createLanguage,
  updateLanguage,
  deleteLanguage,
} = require("../controllers/languageController");

// PUBLIC: Get all languages
router.get("/", getLanguages);

// PUBLIC: Get single language by ID
// KEEP THIS LAST
router.get("/:id", getLanguageById);

// ADMIN ONLY: Create language
router.post("/", ...protect(P.LANGUAGE_MANAGE, "Language"), createLanguage);

// ADMIN ONLY: Update language
router.put("/:id", ...protect(P.LANGUAGE_MANAGE, "Language"), updateLanguage);

// ADMIN ONLY: Delete language
router.delete("/:id", ...protect(P.LANGUAGE_MANAGE, "Language"), deleteLanguage);

module.exports = router;
