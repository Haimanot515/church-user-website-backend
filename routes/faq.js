const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const {
  getFaq,
  createFaq,
  updateFaq,
  deleteFaq,
} = require("../controllers/faqController");

// GET: Publicly accessible to view the FAQ section
router.get("/", getFaq);

// POST: Restricted to admin; used to create a new FAQ entry
router.post("/", auth, adminAuth, createFaq);

// PUT: Restricted to admin; used to update a specific FAQ entry by ID
router.put("/:id", auth, adminAuth, updateFaq);

// DELETE: Restricted to admin; used to delete a specific FAQ entry by ID
router.delete("/:id", auth, adminAuth, deleteFaq);

module.exports = router;