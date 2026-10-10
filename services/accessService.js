const prisma = require("../prisma/prisma.service");
const {
  ROLE_NAMES,
  CATALOG,
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  PERMISSION_LOCKED_ROLES,
  defaultPermissionsFor,
} = require("../config/permissions");
const { resolvePermissions, isSubset, ROLE_NAME_PATTERN } = require("../utils/access");
const { httpError } = require("../utils/adminError");

const ROLE_SELECT = {
  id: true,
  name: true,
  description: true,
  isProtected: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { permission: { select: { name: true } } } },
  _count: { select: { users: true } },
};

const presentRole = (role) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isProtected: role.isProtected,
  permissionsLocked: PERMISSION_LOCKED_ROLES.includes(role.name),
  permissions: resolvePermissions(role).sort(),
  userCount: role._count ? role._count.users : undefined,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
});

exports.presentRole = presentRole;

exports.syncAccessControl = async () => {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: { name: role.name, description: role.description, isProtected: role.isProtected },
    });
  }

  const existing = new Set(
    (await prisma.permission.findMany({ select: { name: true } })).map((p) => p.name)
  );
  const missing = CATALOG.filter((p) => !existing.has(p.name));
  if (missing.length) {
    await prisma.permission.createMany({
      data: missing.map((p) => ({ name: p.name, description: p.description })),
      skipDuplicates: true,
    });
  }
  const stale = [...existing].filter((name) => !ALL_PERMISSIONS.includes(name));
  if (stale.length) await prisma.permission.deleteMany({ where: { name: { in: stale } } });

  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const permissions = await prisma.permission.findMany({ select: { id: true, name: true } });
  const permissionId = new Map(permissions.map((p) => [p.name, p.id]));
  const newlyCreated = new Set(missing.map((p) => p.name));

  const grants = [];
  for (const role of roles) {
    const names =
      role.name === ROLE_NAMES.SUPER_ADMIN
        ? ALL_PERMISSIONS
        : defaultPermissionsFor(role.name).filter((n) => newlyCreated.has(n));
    for (const name of names) {
      if (permissionId.has(name))
        grants.push({ roleId: role.id, permissionId: permissionId.get(name) });
    }
  }
  if (grants.length) await prisma.rolePermission.createMany({ data: grants, skipDuplicates: true });
  return { permissionsCreated: missing.length, permissionsRemoved: stale.length };
};

exports.listRoles = async () => {
  const roles = await prisma.role.findMany({ select: ROLE_SELECT, orderBy: { name: "asc" } });
  return roles.map(presentRole);
};

exports.getRole = async (id) => {
  const role = await prisma.role.findUnique({ where: { id }, select: ROLE_SELECT });
  if (!role) throw httpError(404, "Role not found.");
  return presentRole(role);
};

exports.findRoleByName = (name) =>
  prisma.role
    .findUnique({ where: { name }, select: ROLE_SELECT })
    .then((role) => (role ? presentRole(role) : null));

const validatePermissionNames = (value) => {
  if (!Array.isArray(value) || value.some((p) => typeof p !== "string")) {
    throw httpError(400, "permissions must be a list of permission names.");
  }
  const unique = [...new Set(value)];
  const unknown = unique.filter((p) => !ALL_PERMISSIONS.includes(p));
  if (unknown.length)
    throw httpError(400, `Unknown permissions: ${unknown.slice(0, 5).join(", ")}`);
  return unique;
};

const grantPermissions = async (roleId, names) => {
  if (!names.length) return;
  const rows = await prisma.permission.findMany({
    where: { name: { in: names } },
    select: { id: true },
  });
  await prisma.rolePermission.createMany({
    data: rows.map((row) => ({ roleId, permissionId: row.id })),
    skipDuplicates: true,
  });
};

exports.createRole = async (actor, input) => {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!ROLE_NAME_PATTERN.test(name)) {
    throw httpError(
      400,
      "Role name must be 2 to 32 characters: lowercase letters, numbers and underscores, starting with a letter."
    );
  }
  const description =
    typeof input.description === "string" ? input.description.trim().slice(0, 200) : null;
  const permissions = validatePermissionNames(
    input.permissions === undefined ? [] : input.permissions
  );
  if (!isSubset(permissions, actor.permissions)) {
    throw httpError(403, "You can only give a role permissions that you hold yourself.");
  }
  if (await prisma.role.findUnique({ where: { name }, select: { id: true } })) {
    throw httpError(409, "A role with this name already exists.");
  }
  const created = await prisma.role.create({
    data: { name, description, isProtected: false },
    select: { id: true },
  });
  await grantPermissions(created.id, permissions);
  return exports.getRole(created.id);
};

exports.updateRole = async (actor, id, input) => {
  const before = await exports.getRole(id);
  const patch = {};
  if (input.description !== undefined) {
    if (input.description !== null && typeof input.description !== "string")
      throw httpError(400, "Invalid description.");
    patch.description = input.description === null ? null : input.description.trim().slice(0, 200);
  }

  let added = [];
  let removed = [];
  if (input.permissions !== undefined) {
    if (before.permissionsLocked)
      throw httpError(403, "The permissions of this role cannot be changed.");
    const next = validatePermissionNames(input.permissions);
    added = next.filter((p) => !before.permissions.includes(p));
    removed = before.permissions.filter((p) => !next.includes(p));
    if (!isSubset([...added, ...removed], actor.permissions)) {
      throw httpError(403, "You can only change permissions that you hold yourself.");
    }
  }
  if (input.description === undefined && input.permissions === undefined)
    throw httpError(400, "Nothing to update.");

  if (Object.keys(patch).length)
    await prisma.role.update({ where: { id }, data: { ...patch, updatedAt: new Date() } });
  if (removed.length) {
    const rows = await prisma.permission.findMany({
      where: { name: { in: removed } },
      select: { id: true },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: id, permissionId: { in: rows.map((r) => r.id) } },
    });
  }
  await grantPermissions(id, added);

  return { before, after: await exports.getRole(id), added, removed };
};

exports.deleteRole = async (id) => {
  const role = await exports.getRole(id);
  if (role.isProtected) throw httpError(403, "This role cannot be deleted.");
  if (role.userCount > 0)
    throw httpError(
      409,
      `${role.userCount} user(s) still have this role. Move them to another role first.`
    );
  await prisma.role.delete({ where: { id } });
  return role;
};

const USER_ACCESS_SELECT = {
  id: true,
  name: true,
  email: true,
  isVerified: true,
  tokenVersion: true,
  accessRole: {
    select: { name: true, permissions: { select: { permission: { select: { name: true } } } } },
  },
};

exports.USER_ACCESS_SELECT = USER_ACCESS_SELECT;

exports.assertCanManageUser = (actor, target) => {
  if (actor.id === target.id) return;
  const targetPermissions = resolvePermissions(target.accessRole);
  if (!isSubset(targetPermissions, actor.permissions)) {
    throw httpError(403, "You cannot manage a user who has more access than you.");
  }
};

const countSuperAdmins = () =>
  prisma.user.count({ where: { accessRole: { name: ROLE_NAMES.SUPER_ADMIN } } });

exports.assertNotLastSuperAdmin = async (target) => {
  if (!target.accessRole || target.accessRole.name !== ROLE_NAMES.SUPER_ADMIN) return;
  if ((await countSuperAdmins()) <= 1)
    throw httpError(409, "At least one super admin must remain.");
};

exports.changeUserRole = async (actor, targetId, roleName) => {
  if (typeof roleName !== "string" || !roleName.trim()) throw httpError(400, "role is required.");
  if (actor.id === targetId) throw httpError(403, "You cannot change your own role.");

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: USER_ACCESS_SELECT,
  });
  if (!target) throw httpError(404, "User not found");
  exports.assertCanManageUser(actor, target);

  const role = await exports.findRoleByName(roleName.trim());
  if (!role) throw httpError(400, "Unknown role.");
  if (!isSubset(role.permissions, actor.permissions)) {
    throw httpError(403, "You cannot assign a role that has more access than you.");
  }
  if (role.name !== ROLE_NAMES.SUPER_ADMIN) await exports.assertNotLastSuperAdmin(target);

  const from = target.accessRole ? target.accessRole.name : ROLE_NAMES.USER;
  await prisma.user.update({
    where: { id: targetId },
    data: { roleId: role.id, updatedAt: new Date() },
  });
  return { target, from, to: role.name };
};
