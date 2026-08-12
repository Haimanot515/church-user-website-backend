const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getAbout,
  createAbout,
  updateAbout,
  deleteAbout,
} = require("../controllers/aboutController");

// GET: Publicly accessible to view the about section
router.get("/", getAbout);

// POST: Restricted to admin; used to create the about section for the first time
router.post("/", auth, adminAuth, upload.single("image"), createAbout);

// PUT: Restricted to admin; used to update a specific about entry by ID
router.put("/:id", auth, adminAuth, upload.single("image"), updateAbout);

// DELETE: Restricted to admin; used to delete a specific about entry by ID
router.delete("/:id", auth, adminAuth, deleteAbout);

module.exports = router;