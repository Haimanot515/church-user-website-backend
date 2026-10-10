const accessService = require("../services/accessService");
const auditService = require("../services/auditService");
const { CATALOG } = require("../config/permissions");
const { sendAdminError } = require("../utils/adminError");

exports.listPermissions = (req, res) => {
  res.json({
    success: true,
    permissions: CATALOG.map(({ name, description, sensitive }) => ({
      name,
      description,
      sensitive,
    })),
  });
};

exports.listRoles = async (req, res) => {
  try {
    res.json({ success: true, roles: await accessService.listRoles() });
  } catch (err) {
    sendAdminError(res, err, "List roles");
  }
};

exports.getRole = async (req, res) => {
  try {
    res.json({ success: true, role: await accessService.getRole(req.params.id) });
  } catch (err) {
    sendAdminError(res, err, "Get role");
  }
};

exports.createRole = async (req, res) => {
  try {
    const role = await accessService.createRole(req.user, req.body || {});
    await auditService.event(req, "role.create", {
      severity: "critical",
      entity: "Role",
      entityId: role.id,
      diff: { name: role.name, permissions: role.permissions },
    });
    res.status(201).json({ success: true, role });
  } catch (err) {
    sendAdminError(res, err, "Create role");
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { before, after, added, removed } = await accessService.updateRole(
      req.user,
      req.params.id,
      req.body || {}
    );
    await auditService.event(req, "role.update", {
      severity: added.length || removed.length ? "critical" : "info",
      entity: "Role",
      entityId: after.id,
      diff: {
        description: { from: before.description, to: after.description },
        permissionsAdded: added,
        permissionsRemoved: removed,
      },
    });
    res.json({ success: true, role: after });
  } catch (err) {
    sendAdminError(res, err, "Update role");
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await accessService.deleteRole(req.params.id);
    await auditService.event(req, "role.delete", {
      severity: "critical",
      entity: "Role",
      entityId: role.id,
      diff: { name: role.name, permissions: role.permissions },
    });
    res.json({ success: true, msg: "Role deleted." });
  } catch (err) {
    sendAdminError(res, err, "Delete role");
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    res.json({ success: true, ...(await auditService.list(req.query)) });
  } catch (err) {
    sendAdminError(res, err, "List audit logs");
  }
};
