const router = require("express").Router();
const { createThread } = require("../controllers/contactController");
const auth=require("../middleware/authMiddleware");

const adminAuth=require("../middleware/adminMiddleware");

router.post("/",auth,createThread);

module.exports = router;
