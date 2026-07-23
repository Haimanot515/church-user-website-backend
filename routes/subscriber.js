const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");

const {
  subscribe,
  getSubscribers,
  getSubscriberById,
  unsubscribe,
  deleteSubscriber,
} = require("../controllers/subscriberController");


// PUBLIC: Subscribe
router.post(
  "/subscribe",
  subscribe
);


// PUBLIC: Unsubscribe
router.post(
  "/unsubscribe",
  unsubscribe
);


// ADMIN ONLY: Get all subscribers
router.get(
  "/",
  auth,
  adminAuth,
  getSubscribers
);


// ADMIN ONLY: Get subscriber by ID
// KEEP THIS LAST
router.get(
  "/:id",
  auth,
  adminAuth,
  getSubscriberById
);


// ADMIN ONLY: Delete subscriber
router.delete(
  "/:id",
  auth,
  adminAuth,
  deleteSubscriber
);


module.exports = router;