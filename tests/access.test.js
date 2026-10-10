const { db, addUser, makeReq, makeRes, flush } = require("./helpers/unit");
const test = require("node:test");
const assert = require("node:assert/strict");
const access = require("../services/accessService");
const { requirePermission } = require("../middleware/permissions");
const { toRequestUser, resolvePermissions } = require("../utils/access");
const { ALL_PERMISSIONS, defaultPermissionsFor } = require("../config/permissions");

const actorFor = (user) => toRequestUser(db.users.get(user.id));
const roleNamed = (name) => [...db.roles.values()].find((r) => r.name === name);
const permsOf = (name) =>
  resolvePermissions({
    name,
    permissions: db.rolePermissions
      .filter((rp) => rp.roleId === roleNamed(name).id)
      .map((rp) => ({ permission: db.permissions.get(rp.permissionId) })),
  });

test("default roles get the intended permissions", () => {
  assert.deepEqual(permsOf("super_admin").sort(), [...ALL_PERMISSIONS].sort());
  assert.deepEqual(permsOf("user"), []);
  assert.ok(!permsOf("admin").includes("ROLE_MANAGE"));
  assert.ok(!permsOf("admin").includes("AUDIT_LOG_READ"));
  assert.ok(permsOf("admin").includes("USER_DELETE"));
  assert.ok(permsOf("editor").includes("POST_MANAGE"));
  assert.ok(!permsOf("editor").includes("USER_READ"));
});

test("super_admin always has every permission, even with no grants stored", () => {
  assert.equal(
    resolvePermissions({ name: "super_admin", permissions: [] }).length,
    ALL_PERMISSIONS.length
  );
  assert.deepEqual(
    resolvePermissions({ name: "x", permissions: [{ permission: { name: "NOT_REAL" } }] }),
    []
  );
});

test("sync is idempotent, restores a missing permission, and respects customised roles", async () => {
  const editorId = roleNamed("editor").id;
  const idOf = (name) => [...db.permissions.values()].find((p) => p.name === name).id;
  db.rolePermissions = db.rolePermissions.filter(
    (rp) => !(rp.roleId === editorId && rp.permissionId === idOf("CATEGORY_MANAGE"))
  );
  await access.syncAccessControl();
  assert.ok(!permsOf("editor").includes("CATEGORY_MANAGE"));

  const faqId = idOf("FAQ_MANAGE");
  db.permissions.delete(faqId);
  db.rolePermissions = db.rolePermissions.filter((rp) => rp.permissionId !== faqId);
  db.permissions.set("stale", { id: "stale", name: "OLD_PERMISSION" });
  const result = await access.syncAccessControl();
  assert.equal(result.permissionsCreated, 1);
  assert.equal(result.permissionsRemoved, 1);
  assert.ok(permsOf("editor").includes("FAQ_MANAGE"));
  assert.ok(permsOf("admin").includes("FAQ_MANAGE"));

  const before = db.rolePermissions.length;
  await access.syncAccessControl();
  assert.equal(db.rolePermissions.length, before);
  assert.deepEqual(permsOf("admin").sort(), defaultPermissionsFor("admin").sort());
});

test("requirePermission allows holders, blocks others, and audits the denial once", async () => {
  const editor = addUser({ id: "p1", role: "editor" });
  const allowed = makeRes();
  let called = false;
  requirePermission("POST_MANAGE")(
    makeReq({ user: actorFor(editor) }),
    allowed,
    () => (called = true)
  );
  assert.equal(called, true);

  const res = makeRes();
  called = false;
  requirePermission("USER_DELETE")(
    makeReq({ user: actorFor(editor), originalUrl: "/api/admin/delete/x?y=1" }),
    res,
    () => (called = true)
  );
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.locals.auditHandled, true);
  await flush();
  const denied = db.auditLogs.filter((l) => l.action === "access.denied");
  assert.equal(denied.length, 1);
  assert.equal(denied[0].metadata.path, "/api/admin/delete/x");

  const anonymous = makeRes();
  requirePermission("POST_MANAGE")(makeReq(), anonymous, () => {});
  assert.equal(anonymous.statusCode, 401);
});

test("requirePermission refuses unknown permission names at startup", () => {
  assert.throws(() => requirePermission("POST_MANAGEE"));
  assert.throws(() => requirePermission());
});

test("roles can only be assigned within the actor's own access", async () => {
  const superAdmin = addUser({ id: "a1", role: "super_admin" });
  const admin = addUser({ id: "a2", role: "admin" });
  const member = addUser({ id: "a3" });

  await assert.rejects(access.changeUserRole(actorFor(admin), member.id, "super_admin"), {
    statusCode: 403,
  });
  await assert.rejects(access.changeUserRole(actorFor(admin), admin.id, "editor"), {
    statusCode: 403,
  });
  await assert.rejects(access.changeUserRole(actorFor(admin), superAdmin.id, "user"), {
    statusCode: 403,
  });
  await assert.rejects(access.changeUserRole(actorFor(admin), member.id, "nope"), {
    statusCode: 400,
  });

  const done = await access.changeUserRole(actorFor(admin), member.id, "editor");
  assert.deepEqual([done.from, done.to], ["user", "editor"]);
  assert.equal(db.users.get(member.id).roleId, roleNamed("editor").id);
});

test("the last super admin cannot be demoted or deleted", async () => {
  const userRoleId = roleNamed("user").id;
  for (const u of db.users.values())
    if (u.roleId === roleNamed("super_admin").id) u.roleId = userRoleId;
  const only = addUser({ id: "d1", role: "super_admin" });
  await assert.rejects(access.assertNotLastSuperAdmin(db.users.get(only.id)), { statusCode: 409 });
  addUser({ id: "d2", role: "super_admin" });
  await assert.doesNotReject(access.assertNotLastSuperAdmin(db.users.get(only.id)));
  await assert.doesNotReject(access.assertNotLastSuperAdmin(db.users.get("d2")));
});

test("role edits cannot grant what the actor lacks and locked roles stay locked", async () => {
  const admin = actorFor(addUser({ id: "b1", role: "admin" }));
  const owner = actorFor(addUser({ id: "b2", role: "super_admin" }));

  await assert.rejects(access.createRole(admin, { name: "bad name" }), { statusCode: 400 });
  await assert.rejects(
    access.createRole(admin, { name: "greeter", permissions: ["ROLE_MANAGE"] }),
    { statusCode: 403 }
  );
  await assert.rejects(access.createRole(admin, { name: "greeter", permissions: ["NOPE"] }), {
    statusCode: 400,
  });

  const role = await access.createRole(admin, {
    name: "greeter",
    description: "Greets",
    permissions: ["FAQ_MANAGE"],
  });
  assert.deepEqual(role.permissions, ["FAQ_MANAGE"]);
  await assert.rejects(access.createRole(owner, { name: "greeter" }), { statusCode: 409 });

  await assert.rejects(
    access.updateRole(admin, role.id, { permissions: ["FAQ_MANAGE", "ROLE_MANAGE"] }),
    { statusCode: 403 }
  );
  const updated = await access.updateRole(admin, role.id, { permissions: ["POST_MANAGE"] });
  assert.deepEqual([updated.added, updated.removed], [["POST_MANAGE"], ["FAQ_MANAGE"]]);

  await assert.rejects(access.updateRole(owner, roleNamed("super_admin").id, { permissions: [] }), {
    statusCode: 403,
  });
  await assert.rejects(
    access.updateRole(owner, roleNamed("user").id, { permissions: ["POST_MANAGE"] }),
    { statusCode: 403 }
  );
  await assert.rejects(access.updateRole(owner, role.id, {}), { statusCode: 400 });
});

test("protected and in-use roles cannot be deleted", async () => {
  const owner = actorFor(addUser({ id: "c1", role: "super_admin" }));
  await assert.rejects(access.deleteRole(roleNamed("admin").id), { statusCode: 403 });
  const role = await access.createRole(owner, { name: "temp_role" });
  addUser({ id: "c2", role: "temp_role" });
  await assert.rejects(access.deleteRole(role.id), { statusCode: 409 });
  db.users.get("c2").roleId = roleNamed("user").id;
  await access.deleteRole(role.id);
  assert.equal(db.roles.has(role.id), false);
});
