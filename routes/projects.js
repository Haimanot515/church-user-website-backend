const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { getProjects, createProject } = require("../controllers/projectController");

router.get("/",auth, getProjects);
router.post("/", auth,adminAuth,  upload.single("image"), createProject);

module.exports = router;
