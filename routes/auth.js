const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const {
  authLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} = require("../middleware/rateLimiters");
const turnstile = require("../middleware/turnstile");
const { register, login, verify, logout } = require("../controllers/authController");
const {
  refresh,
  me,
  listSessions,
  revokeSession,
  logoutAll,
} = require("../controllers/sessionController");

router.post("/register", registerLimiter, turnstile, register);
router.post("/login", authLimiter, loginLimiter, turnstile, login);
router.post("/verify", authLimiter, turnstile, verify);
router.post("/refresh", refreshLimiter, refresh);

router.get("/me", auth, me);
router.post("/logout", auth, logout);
router.post("/logout-all", auth, logoutAll);
router.get("/sessions", auth, listSessions);
router.delete("/sessions/:id", auth, revokeSession);

module.exports = router;
