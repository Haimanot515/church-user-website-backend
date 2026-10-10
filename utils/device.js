module.exports = (req) => ({
  ipAddress: req.ip,
  userAgent: req.headers ? req.headers["user-agent"] : undefined,
});
