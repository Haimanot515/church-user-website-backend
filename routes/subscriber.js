const router = require("express").Router();
const {
  subscribe,
  unsubscribe,
  getAllSubscribers,
} = require("../controllers/subscriberController");
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const { subscribeLimiter } = require("../middleware/rateLimiters");

router.post("/", subscribeLimiter, subscribe);
// Requires a signed token (see utils/unsubscribeToken.js)
router.get("/unsubscribe", unsubscribe);
router.get(
  "/",
  ...protect(P.SUBSCRIBER_READ, "Subscriber", { action: "subscriber.list" }),
  getAllSubscribers
);

module.exports = router;
