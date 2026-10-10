const auditService = require("../services/auditService");
const { hasPermission } = require("../utils/access");
const { ALL_PERMISSIONS } = require("../config/permissions");

exports.requirePermission = (...required) => {
  const unknown = required.filter((permission) => !ALL_PERMISSIONS.includes(permission));
  if (required.length === 0 || unknown.length) {
    throw new Error(
      `requirePermission called with unknown permission: ${unknown.join(", ") || "(none)"}`
    );
  }

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: "No user info." });

    const missing = required.filter((permission) => !hasPermission(req.user, permission));
    if (missing.length === 0) return next();

    res.locals.auditHandled = true;
    auditService.event(req, "access.denied", {
      outcome: "denied",
      severity: "warning",
      metadata: { required, method: req.method, path: req.originalUrl.split("?")[0] },
    });
    return res
      .status(403)
      .json({ msg: "You do not have permission to do this.", code: "forbidden" });
  };
};
