const crypto = require("crypto");

// Signed, non-guessable unsubscribe tokens so nobody can unsubscribe
// someone else just by knowing their email address.
const sign = (email) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(`unsubscribe:${String(email).trim().toLowerCase()}`)
    .digest("hex");

exports.createUnsubscribeToken = sign;

exports.verifyUnsubscribeToken = (email, token) => {
  if (typeof token !== "string" || !token) return false;
  const expected = Buffer.from(sign(email));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

exports.buildUnsubscribeUrl = (email) => {
  const base = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
  const qs = `email=${encodeURIComponent(email)}&token=${sign(email)}`;
  return `${base}/api/subscribers/unsubscribe?${qs}`;
};
