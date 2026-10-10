const int = (name, fallback) => {
  const n = Number.parseInt(process.env[name], 10);
  return Number.isFinite(n) ? n : fallback;
};

const { parseDuration } = require("../utils/duration");

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

module.exports = {
  trustProxyHops: int("TRUST_PROXY_HOPS", 1),

  passwordMinLength: int("PASSWORD_MIN_LENGTH", 8),

  maxReauthAttempts: int("MAX_REAUTH_ATTEMPTS", 5),

  turnstile: {
    enabled: process.env.TURNSTILE_ENABLED === "true",
    secretKey: process.env.TURNSTILE_SECRET_KEY || "",
  },

  bcryptRounds: int("BCRYPT_SALT_ROUNDS", 10),

  accessTokenTtl: (process.env.JWT_EXPIRES_IN || "15m").trim(),
  refreshTtlMs: parseDuration(process.env.REFRESH_EXPIRES_IN, 7 * DAY),
  sessionMaxAgeMs: int("SESSION_MAX_AGE_DAYS", 30) * DAY,
  refreshReuseGraceMs: 10 * 1000,
  sessionTouchIntervalMs: 5 * MIN,

  maxLoginAttempts: int("MAX_LOGIN_ATTEMPTS", 5),
  lockoutMs: int("LOCKOUT_DURATION_MINUTES", 15) * MIN,

  otpExpiresMs: int("OTP_EXPIRES_IN_MINUTES", 10) * MIN,
  otpExpiresMinutes: int("OTP_EXPIRES_IN_MINUTES", 10),
  otpMaxAttempts: int("OTP_MAX_ATTEMPTS", 5),

  rate: {
    globalWindowMs: int("THROTTLE_WINDOW_MINUTES", 15) * MIN,
    globalLimit: int("THROTTLE_LIMIT", 600),
    authLimit: int("AUTH_RATE_LIMIT", 20),
    loginLimit: int("LOGIN_RATE_LIMIT", 8),
    refreshLimit: int("REFRESH_RATE_LIMIT", 120),
    reauthWindowMs: 15 * MIN,
  },
};
