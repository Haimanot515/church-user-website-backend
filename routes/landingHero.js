const router = require("express").Router();
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const upload = require("../middleware/uploadMiddleware");
const {
  getLanding,
  updateHero,
  updateAcademic,
  updateVideos,
  updateLifestyle,
} = require("../controllers/landingController");

// -----------------------------------------------------------
// 1️⃣ PUBLIC ROUTES
// -----------------------------------------------------------
router.get("/", getLanding);

// -----------------------------------------------------------
// 2️⃣ ADMIN PROTECTED ROUTES
// -----------------------------------------------------------

// PUT: Update Hero & My Campus
router.put(
  "/hero",
  ...protect(P.LANDING_HERO_MANAGE, "LandingHero"),
  upload.fields([
    { name: "heroImage", maxCount: 1 }, // 🚀 New: The Main Professional Photo
    { name: "campusImage", maxCount: 1 }, // The Campus Background Image
    { name: "mainShowcaseFile", maxCount: 1 }, // The Campus Video File
  ]),
  updateHero
);

// 2️⃣ UPDATE ACADEMIC AWARDS
// Note: This middleware handles the "image" file while
// personalBio and the NEW awards list are passed in req.body
router.put(
  "/academic",
  ...protect(P.LANDING_HERO_MANAGE, "LandingHero"),
  upload.single("image"),
  updateAcademic
);

// PUT: Update Video Assets
router.put(
  "/videos",
  ...protect(P.LANDING_HERO_MANAGE, "LandingHero"),
  upload.fields([
    { name: "mainShowcaseFile", maxCount: 1 },
    { name: "selectedProjectFile", maxCount: 1 },
    { name: "architectureFile", maxCount: 1 },
    { name: "innovationFile", maxCount: 1 },
  ]),
  updateVideos
);

// PUT: Update Knowledge Sharing & Lifestyle
router.put(
  "/lifestyle",
  ...protect(P.LANDING_HERO_MANAGE, "LandingHero"),
  upload.fields([
    { name: "tutorialImage", maxCount: 1 },
    { name: "lifestyleImage", maxCount: 1 },
  ]),
  updateLifestyle
);

module.exports = router;
