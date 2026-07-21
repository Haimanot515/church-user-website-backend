const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { getAbout, createAbout, updateAbout } = require("../controllers/aboutController");

// GET: Publicly accessible to view the about section
router.get("/", auth,getAbout);

// POST: Restricted to admin; used to create the about section for the first time
router.post("/", auth,adminAuth, upload.single("image"), createAbout);

// PUT: Restricted to admin; used to update the existing about section
router.put("/", auth,adminAuth,upload.single("image"), updateAbout);

module.exports = router;