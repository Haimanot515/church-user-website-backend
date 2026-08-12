const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { register, login, verify, logout } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/verify", verify);

// Protected: only a request carrying a currently-valid token can "log out"
router.post("/logout", auth, logout);

module.exports = router;