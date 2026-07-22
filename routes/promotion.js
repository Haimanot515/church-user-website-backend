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


// PUBLIC: get all promotions — no auth, so the homepage can load it
router.get("/", getPromotion);


// PUBLIC: get only the most recent promotion — put this ABOVE any "/:id"
// route you add later, or "latest" will get swallowed as an :id value
router.get("/latest", getLatestPromotion);


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