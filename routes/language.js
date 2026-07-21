const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");

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
router.post(
  "/",
  auth,
  adminAuth,
  createLanguage
);


// ADMIN ONLY: Update language
router.put(
  "/:id",
  auth,
  adminAuth,
  updateLanguage
);


// ADMIN ONLY: Delete language
router.delete(
  "/:id",
  auth,
  adminAuth,
  deleteLanguage
);


module.exports = router;