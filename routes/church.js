const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  // Church
  getChurches,
  getChurchById,
  createChurch,
  updateChurch,
  deleteChurch,

  // Church Assignment
  createAssignment,
  getAssignments,
  getCurrentChurch,
  deleteAssignment,
} = require("../controllers/churchController");

// =========================
// CHURCH ASSIGNMENT ROUTES
// (must come before "/:id" so "assignments"/"current" aren't
// swallowed by the church id wildcard)
// =========================

// ADMIN: Assign priest/user to church
router.post("/assignment", auth, adminAuth, createAssignment);

// PUBLIC: Get all assignments
router.get("/assignments", getAssignments);

// PUBLIC: Get current church of a priest
router.get("/current/:userId", getCurrentChurch);

// ADMIN: Delete assignment
router.delete("/assignment/:id", auth, adminAuth, deleteAssignment);

// =========================
// CHURCH ROUTES
// =========================

// PUBLIC: Get all churches
router.get("/", getChurches);

// PUBLIC: Get single church
router.get("/:id", getChurchById);

// ADMIN: Create church
router.post("/", auth, adminAuth, upload.single("image"), createChurch);

// ADMIN: Update church
router.put("/:id", auth, adminAuth, upload.single("image"), updateChurch);

// ADMIN: Delete church
router.delete("/:id", auth, adminAuth, deleteChurch);

module.exports = router;