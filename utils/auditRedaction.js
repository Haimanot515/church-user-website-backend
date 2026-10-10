const REDACTED = "[REDACTED]";
const EXACT_KEYS = new Set([
  "otp",
  "code",
  "authorization",
  "cookie",
  "apikey",
  "privatekey",
  "signedurl",
]);
const SENSITIVE_SUFFIX = /(password|passcode|secret|token|hash|otp|credential)$/;
const SENSITIVE_VALUE = /(X-Amz-Signature|X-Goog-Signature|[?&](token|signature)=)/i;
const MAX_DEPTH = 8;

const isSensitiveKey = (key) => {
  const k = String(key).toLowerCase().replace(/[_-]/g, "");
  return EXACT_KEYS.has(k) || SENSITIVE_SUFFIX.test(k);
};

const redact = (value, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return REDACTED;
  if (typeof value === "string") return SENSITIVE_VALUE.test(value) ? REDACTED : value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redact(val, depth + 1);
    }
    return out;
  }
  return value;
};

module.exports = { redact, REDACTED };
