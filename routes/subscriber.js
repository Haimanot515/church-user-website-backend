const router = require("express").Router();
const {
  subscribe,
  unsubscribe,
  getAllSubscribers,
} = require("../controllers/subscriberController");
const adminAuth = require("../middleware/adminMiddleware");

router.post("/", subscribe);
router.get("/unsubscribe", unsubscribe);
router.get("/", adminAuth, getAllSubscribers);

module.exports = router;