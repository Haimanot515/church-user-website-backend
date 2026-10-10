const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "BREVO_API_KEY",
  "EMAIL_FROM",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const NUMERIC = [
  ["PORT", 1, 65535],
  ["BCRYPT_SALT_ROUNDS", 4, 15],
  ["MAX_LOGIN_ATTEMPTS", 1, 20],
  ["LOCKOUT_DURATION_MINUTES", 1, 1440],
  ["OTP_EXPIRES_IN_MINUTES", 1, 60],
  ["OTP_MAX_ATTEMPTS", 1, 10],
  ["THROTTLE_WINDOW_MINUTES", 1, 1440],
  ["THROTTLE_LIMIT", 1, 100000],
  ["AUTH_RATE_LIMIT", 1, 1000],
  ["LOGIN_RATE_LIMIT", 1, 1000],
  ["TRUST_PROXY_HOPS", 0, 10],
  ["PASSWORD_MIN_LENGTH", 6, 128],
  ["SESSION_MAX_AGE_DAYS", 1, 365],
  ["REFRESH_RATE_LIMIT", 1, 10000],
  ["MAX_REAUTH_ATTEMPTS", 1, 20],
  ["MAX_IMAGE_UPLOAD_MB", 1, 100],
  ["MAX_MEDIA_UPLOAD_MB", 1, 500],
];

const { DURATION_PATTERN, parseDuration } = require("../utils/duration");

const PLACEHOLDER_SECRET = /change.?me|your.?secret|secret.?key|password|example|test/i;

const isProd = () => process.env.NODE_ENV === "production";

const parseOrigins = () =>
  [process.env.CLIENT_URL, ...(process.env.CORS_ORIGINS || "").split(",")]
    .map((s) => (s || "").trim())
    .filter(Boolean);

const checkOrigin = (origin, errors) => {
  let url;
  try {
    url = new URL(origin);
  } catch {
    errors.push(
      `Invalid origin "${origin}" in CLIENT_URL/CORS_ORIGINS (must be like https://example.com).`
    );
    return;
  }
  if (url.origin !== origin) {
    errors.push(`Origin "${origin}" must have no path or trailing slash (use "${url.origin}").`);
    return;
  }
  if (isProd()) {
    if (url.protocol !== "https:") errors.push(`Origin "${origin}" must use https in production.`);
    if (/^(localhost|127\.|0\.0\.0\.0)/.test(url.hostname)) {
      errors.push(`Origin "${origin}" points to localhost, which is not allowed in production.`);
    }
  }
};

exports.collectEnvErrors = () => {
  const env = process.env;
  const errors = [];
  const warnings = [];

  const missing = REQUIRED.filter((k) => !env[k] || !env[k].trim());
  if (missing.length) errors.push(`Missing required environment variables: ${missing.join(", ")}`);

  if (env.NODE_ENV && !["development", "test", "production"].includes(env.NODE_ENV)) {
    errors.push('NODE_ENV must be "development", "test" or "production".');
  }

  if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
    errors.push("DATABASE_URL must be a postgres:// or postgresql:// connection string.");
  }

  const secret = env.JWT_SECRET || "";
  if (secret) {
    if (secret.length < 32) errors.push("JWT_SECRET must be at least 32 characters long.");
    else if (isProd() && (new Set(secret).size < 10 || PLACEHOLDER_SECRET.test(secret))) {
      errors.push("JWT_SECRET looks like a placeholder or is too predictable. Run: npm run secret");
    }
  }

  if (env.JWT_EXPIRES_IN && !DURATION_PATTERN.test(env.JWT_EXPIRES_IN.trim())) {
    errors.push('JWT_EXPIRES_IN must look like "30m", "12h" or "1d".');
  }

  if (env.REFRESH_EXPIRES_IN && !DURATION_PATTERN.test(env.REFRESH_EXPIRES_IN.trim())) {
    errors.push('REFRESH_EXPIRES_IN must look like "12h", "7d" or "2w".');
  }

  if (env.EMAIL_FROM && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EMAIL_FROM.trim())) {
    errors.push("EMAIL_FROM must be a valid email address.");
  }

  for (const [name, min, max] of NUMERIC) {
    if (env[name] === undefined || env[name] === "") continue;
    const n = Number(env[name]);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors.push(`${name} must be a whole number between ${min} and ${max}.`);
    }
  }

  parseOrigins().forEach((o) => checkOrigin(o, errors));

  if (env.TURNSTILE_ENABLED && !["true", "false"].includes(env.TURNSTILE_ENABLED)) {
    errors.push('TURNSTILE_ENABLED must be "true" or "false".');
  }
  if (env.TURNSTILE_ENABLED === "true" && !(env.TURNSTILE_SECRET_KEY || "").trim()) {
    errors.push("TURNSTILE_SECRET_KEY is required when TURNSTILE_ENABLED=true.");
  }

  if (isProd()) {
    if (Number(env.BCRYPT_SALT_ROUNDS || 10) < 10) {
      errors.push("BCRYPT_SALT_ROUNDS must be at least 10 in production.");
    }
    if (!env.BACKEND_URL) {
      errors.push("BACKEND_URL is required in production (used for signed unsubscribe links).");
    } else if (!/^https:\/\//.test(env.BACKEND_URL) || env.BACKEND_URL.endsWith("/")) {
      errors.push("BACKEND_URL must start with https:// and have no trailing slash.");
    }
    if (parseOrigins().length === 0) {
      errors.push(
        "Set CLIENT_URL and/or CORS_ORIGINS in production (the browser origins allowed by CORS)."
      );
    }
    if (env.TURNSTILE_ENABLED !== "true") {
      warnings.push("TURNSTILE_ENABLED is not true: login, register and verify have no captcha.");
    }
    if (env.TRUST_PROXY_HOPS === undefined || env.TRUST_PROXY_HOPS === "") {
      warnings.push(
        "TRUST_PROXY_HOPS is not set: defaulting to 1 proxy hop. Set it to match your host."
      );
    }
    if (parseDuration(env.JWT_EXPIRES_IN, 15 * 60 * 1000) > 60 * 60 * 1000) {
      warnings.push(
        "JWT_EXPIRES_IN is over 1 hour. Access tokens are now backed by sessions, so 15m is recommended."
      );
    }
    if (env.ALLOW_PRODUCTION_SEED === "true") {
      warnings.push("ALLOW_PRODUCTION_SEED=true: remove it unless you are seeding on purpose.");
    }
  }

  return { errors, warnings };
};

exports.validateEnv = () => {
  const { errors, warnings } = exports.collectEnvErrors();
  warnings.forEach((w) => console.warn(`${w}`));
  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n - ${errors.join("\n - ")}`);
  }
};

exports.getAllowedOrigins = () => {
  const fromEnv = parseOrigins();

  const defaults = [
    "https://church-website-admin.onrender.com",
    "https://church-user-website-frontend.onrender.com",
  ];

  const dev =
    isProd() && process.env.ALLOW_LOCALHOST_ORIGINS !== "true"
      ? []
      : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5176"];

  return [...new Set([...(fromEnv.length ? fromEnv : defaults), ...dev])];
};
