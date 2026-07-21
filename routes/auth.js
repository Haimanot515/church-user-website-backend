const router = require("express").Router();
const { register, login,verify } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/verify",verify);

module.exports = router;
