const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
/* IMPORT UPLOAD MIDDLEWARE (Matches your project route logic) */
const upload = require("../middleware/uploadMiddleware"); 
const { getSkills, createSkill } = require("../controllers/skillController");

router.get("/", auth, getSkills);

/* FIXED: Using upload.single("image") to parse FormData and prevent req.body errors */
router.post("/", auth, adminAuth, upload.single("image"), createSkill);

module.exports = router;
