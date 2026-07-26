const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getChurchPersons,
  getChurchPersonById,
  createChurchPerson,
  updateChurchPerson,
  removeChurchPersonPhoto,
  deleteChurchPerson,
} = require("../controllers/churchPersonController");

// GET: Publicly accessible to view all church persons (leaders, special thanks, testimonies)
// Supports ?category=leader | specialThanks | testimony to filter
router.get("/", getChurchPersons);

// GET: Publicly accessible to view a single church person by ID
router.get("/:id", getChurchPersonById);

// POST: Restricted to admin; used to add a new church person with multiple photo uploads
router.post("/", auth, adminAuth, upload.array("photos", 10), createChurchPerson);

// PUT: Restricted to admin; used to update a specific church person by ID
router.put("/:id", auth, adminAuth, upload.array("photos", 10), updateChurchPerson);

// PATCH: Restricted to admin; used to remove a single photo from a church person's photos array
router.patch("/:id/photo", auth, adminAuth, removeChurchPersonPhoto);

// DELETE: Restricted to admin; used to remove a church person by ID
router.delete("/:id", auth, adminAuth, deleteChurchPerson);

module.exports = router;