const router = require("express").Router();
const { createThread } = require("../controllers/contactController");
const auth = require("../middleware/authMiddleware");
const { contactLimiter } = require("../middleware/rateLimiters");

router.post("/", contactLimiter, auth, createThread);

module.exports = router;
