const { ROLE_NAMES, ALL_PERMISSIONS } = require("../config/permissions");

const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;

exports.ROLE_NAME_PATTERN = ROLE_NAME_PATTERN;

exports.resolvePermissions = (accessRole) => {
  if (!accessRole) return [];
  if (accessRole.name === ROLE_NAMES.SUPER_ADMIN) return [...ALL_PERMISSIONS];
  const known = new Set(ALL_PERMISSIONS);
  const names = (accessRole.permissions || []).map((rp) => rp.permission && rp.permission.name);
  return [...new Set(names.filter((n) => known.has(n)))];
};

exports.toRequestUser = (user, sessionId) => {
  const permissions = exports.resolvePermissions(user.accessRole);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
    tokenVersion: user.tokenVersion,
    role: user.accessRole ? user.accessRole.name : ROLE_NAMES.USER,
    permissions,
    isAdmin: permissions.length > 0,
    sessionId: sessionId || null,
  };
};

exports.toPublicUser = (user) => {
  const actor = user.permissions ? user : exports.toRequestUser(user);
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    role: actor.role,
    isAdmin: actor.isAdmin,
    permissions: actor.permissions,
  };
};

exports.hasPermission = (user, permission) =>
  Boolean(user && Array.isArray(user.permissions) && user.permissions.includes(permission));

exports.isSubset = (needed, held) => {
  const have = new Set(held);
  return needed.every((p) => have.has(p));
};
