const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const { rate, maxReauthAttempts } = require("../config/security");

const make = ({
  windowMs,
  limit,
  message,
  keyGenerator,
  skipSuccessfulRequests,
  requestWasSuccessful,
}) =>
  rateLimit({
    windowMs,
    limit,
    ...(skipSuccessfulRequests && { skipSuccessfulRequests }),
    ...(requestWasSuccessful && { requestWasSuccessful }),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    handler: (req, res) => res.status(429).json({ msg: message, message }),
  });

const MIN = 60 * 1000;

exports.globalLimiter = make({
  windowMs: rate.globalWindowMs,
  limit: rate.globalLimit,
  message: "Too many requests. Please try again later.",
});

exports.authLimiter = make({
  windowMs: 15 * MIN,
  limit: rate.authLimit,
  message: "Too many attempts. Please try again in a few minutes.",
});

exports.loginLimiter = make({
  windowMs: 15 * MIN,
  limit: rate.loginLimit,
  message: "Too many login attempts. Please try again in a few minutes.",
  keyGenerator: (req) => {
    const email =
      req.body && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${ipKeyGenerator(req.ip)}|${email.slice(0, 254)}`;
  },
});

exports.refreshLimiter = make({
  windowMs: 15 * MIN,
  limit: rate.refreshLimit,
  message: "Too many session refreshes. Please try again in a few minutes.",
});

exports.registerLimiter = make({
  windowMs: 60 * MIN,
  limit: 5,
  message: "Too many verification requests. Please try again later.",
});

exports.subscribeLimiter = make({
  windowMs: 60 * MIN,
  limit: 10,
  message: "Too many subscription attempts. Please try again later.",
});

exports.contactLimiter = make({
  windowMs: 60 * MIN,
  limit: 15,
  message: "You are sending messages too quickly. Please try again later.",
});

// Counts only failed re-authentications, per signed-in user, so a stolen session cannot guess the password.
exports.reauthLimiter = make({
  windowMs: rate.reauthWindowMs,
  limit: maxReauthAttempts,
  message: "Too many incorrect passwords. Please try again later.",
  keyGenerator: (req) => `reauth|${req.user ? req.user.id : "anonymous"}`,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => !res.locals.reauthFailed,
});
