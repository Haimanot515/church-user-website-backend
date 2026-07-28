const router = require("express").Router();
const {
  subscribe,
  unsubscribe,
  getAllSubscribers,
} = require("../controllers/subscriberController");
const adminAuth = require("../middleware/adminMiddleware");
const auth=require("../middleware/authMiddleware");


router.post("/", subscribe);
router.get("/unsubscribe", unsubscribe);
router.get("/",auth, adminAuth, getAllSubscribers);

module.exports = router;