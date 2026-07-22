const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  getLatestPromotion,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion
} = require("../controllers/promotionController");


// GET: Publicly accessible - get all promotions
router.get("/", auth, getPromotion);


// POST: Admin only - create promotion
router.post(
  "/",
  auth,
  adminAuth,
  upload.single("photo"),
  createPromotion
);


// PUT: Admin only - update promotion by ID
router.put(
  "/:id",
  auth,
  adminAuth,
  upload.single("photo"),
  updatePromotion
);


// DELETE: Admin only - delete promotion by ID
router.delete(
  "/:id",
  auth,
  adminAuth,
  deletePromotion
);


module.exports = router;