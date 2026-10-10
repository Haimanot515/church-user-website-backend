const router = require("express").Router();
const protect = require("../middleware/protect");
const { requireReauth } = require("../middleware/reauth");
const { P } = require("../config/permissions");
const c = require("../controllers/accessController");

router.get(
  "/permissions",
  ...protect(P.PERMISSION_READ, "Permission", { audit: false }),
  c.listPermissions
);

router.get("/roles", ...protect(P.ROLE_READ, "Role", { audit: false }), c.listRoles);
router.get("/roles/:id", ...protect(P.ROLE_READ, "Role", { audit: false }), c.getRole);
router.post(
  "/roles",
  ...protect(P.ROLE_MANAGE, "Role", { audit: false }),
  requireReauth,
  c.createRole
);
router.put(
  "/roles/:id",
  ...protect(P.ROLE_MANAGE, "Role", { audit: false }),
  requireReauth,
  c.updateRole
);
router.delete(
  "/roles/:id",
  ...protect(P.ROLE_MANAGE, "Role", { audit: false }),
  requireReauth,
  c.deleteRole
);

router.get(
  "/audit-logs",
  ...protect(P.AUDIT_LOG_READ, "AuditLog", { audit: false }),
  c.listAuditLogs
);

module.exports = router;
