const crypto = require("crypto");

const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

module.exports = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  req.id = typeof incoming === "string" && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.set("X-Request-Id", req.id);
  next();
};
