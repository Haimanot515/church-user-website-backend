const https = require("https");
const { turnstile } = require("../config/security");

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;
const TIMEOUT_MS = 5000;

const verify = (token, ip) =>
  new Promise((resolve, reject) => {
    const params = new URLSearchParams({ secret: turnstile.secretKey, response: token });
    if (ip) params.set("remoteip", ip);
    const body = params.toString();

    const req = https.request(
      VERIFY_URL,
      {
        method: "POST",
        timeout: TIMEOUT_MS,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new Error("Invalid response from Turnstile"));
          }
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("Turnstile request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });

// Fails closed when enabled: a missing or bad token, or Cloudflare being unreachable, blocks the request.
module.exports = async (req, res, next) => {
  if (!turnstile.enabled) return next();

  if (!turnstile.secretKey) {
    return res
      .status(503)
      .json({ msg: "Captcha is not configured.", code: "captcha_not_configured" });
  }

  const header = req.headers["x-captcha-token"];
  const token = (Array.isArray(header) ? header[0] : header || "").trim();

  if (!token) return res.status(403).json({ msg: "Captcha required.", code: "captcha_required" });
  if (token.length > MAX_TOKEN_LENGTH) {
    return res.status(403).json({ msg: "Captcha failed.", code: "captcha_failed" });
  }

  try {
    const result = await verify(token, req.ip);
    if (!result.success) {
      console.warn(
        `Turnstile rejected a token: ${(result["error-codes"] || []).join(",") || "unknown"}`
      );
      return res.status(403).json({ msg: "Captcha failed.", code: "captcha_failed" });
    }
    return next();
  } catch (err) {
    console.error(`Turnstile verification unavailable: ${err.message}`);
    return res
      .status(503)
      .json({ msg: "Captcha check unavailable. Try again.", code: "captcha_unavailable" });
  }
};

module.exports.verify = verify;
