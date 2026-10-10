const router = require("express").Router();

const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const upload = require("../middleware/uploadMiddleware");

const {
  // Church
  getChurches,
  getChurchById,
  getPrimaryChurch,
  createChurch,
  updateChurch,
  deleteChurch,

  // Church Assignment
  createAssignment,
  updateAssignment,
  getAssignments,
  getCurrentChurch,
  getLeadershipChurch,
  deleteAssignment,
} = require("../controllers/churchController");

// =========================
// CHURCH ASSIGNMENT ROUTES
// (must come before "/:id" so "assignments"/"current" aren't
// swallowed by the church id wildcard)
// =========================

// ADMIN: Assign priest/user to church (accepts the leader's photo)
router.post(
  "/assignment",
  ...protect(P.CHURCH_ASSIGNMENT_MANAGE, "ChurchAssignment"),
  upload.single("image"),
  createAssignment
);

// ADMIN: Update an assignment (isCurrent / isPrimary / photo / etc.)
router.put(
  "/assignment/:id",
  ...protect(P.CHURCH_ASSIGNMENT_MANAGE, "ChurchAssignment"),
  upload.single("image"),
  updateAssignment
);

// PUBLIC: Get all assignments
router.get("/assignments", getAssignments);

// PUBLIC: Get the featured/primary leader's current church (no userId needed)
router.get("/current", getLeadershipChurch);

// PUBLIC: Get current church of a specific priest/user
router.get("/current/:userId", getCurrentChurch);

// ADMIN: Delete assignment
router.delete(
  "/assignment/:id",
  ...protect(P.CHURCH_ASSIGNMENT_MANAGE, "ChurchAssignment"),
  deleteAssignment
);

// =========================
// CHURCH ROUTES
// =========================

// PUBLIC: Get the primary church (powers the Hero section)
router.get("/primary", getPrimaryChurch);

// PUBLIC: Get all churches
router.get("/", getChurches);

// PUBLIC: Get single church
router.get("/:id", getChurchById);

// ADMIN: Create church
router.post("/", ...protect(P.CHURCH_MANAGE, "Church"), upload.single("image"), createChurch);

// ADMIN: Update church
router.put("/:id", ...protect(P.CHURCH_MANAGE, "Church"), upload.single("image"), updateChurch);

// ADMIN: Delete church
router.delete("/:id", ...protect(P.CHURCH_MANAGE, "Church"), deleteChurch);

module.exports = router;
