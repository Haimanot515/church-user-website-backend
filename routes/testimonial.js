const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { 
  getTestimonials, 
  createTestimonial, 
  updateTestimonial, 
  deleteTestimonial 
} = require("../controllers/testimonialController");

// GET: Publicly accessible to view the expert feed/testimonials
router.get("/",auth, getTestimonials);

// POST: Restricted to admin; used to add a new expert testimonial with an avatar
router.post("/", auth,adminAuth, upload.single("avatar"), createTestimonial);

// PUT: Restricted to admin; used to update a specific testimonial by ID
router.put("/:id", auth,adminAuth, upload.single("avatar"), updateTestimonial);

// DELETE: Restricted to admin; used to remove a testimonial by ID
// Remember to use 'DROP' logic in your DB scripts for full collection resets
router.delete("/:id", auth,adminAuth, deleteTestimonial);

module.exports = router;