const router = require("express").Router();

const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const upload = require("../middleware/uploadMiddleware");

const {
  getLatestPromotion,
  getPromotion,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
} = require("../controllers/promotionController");

// PUBLIC: get all promotions — no auth, so the homepage can load it
router.get("/", getPromotion);

// PUBLIC: get only the most recent promotion — must stay ABOVE "/:id"
// or "latest" will get swallowed as an :id value
router.get("/latest", getLatestPromotion);

// PUBLIC/ADMIN: get a single promotion by ID — used by the admin edit page
// to pre-fill the form. Must also stay ABOVE nothing else, but BELOW "/latest"
router.get("/:id", getPromotionById);

// POST: Admin only - create promotion
router.post(
  "/",
  ...protect(P.PROMOTION_MANAGE, "Promotion"),
  upload.single("photo"),
  createPromotion
);

// PUT: Admin only - update promotion by ID
router.put(
  "/:id",
  ...protect(P.PROMOTION_MANAGE, "Promotion"),
  upload.single("photo"),
  updatePromotion
);

// DELETE: Admin only - delete promotion by ID
router.delete("/:id", ...protect(P.PROMOTION_MANAGE, "Promotion"), deletePromotion);

module.exports = router;
