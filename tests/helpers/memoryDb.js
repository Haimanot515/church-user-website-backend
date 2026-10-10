const crypto = require("crypto");
const {
  CATALOG,
  DEFAULT_ROLES,
  ALL_PERMISSIONS,
  defaultPermissionsFor,
} = require("../../config/permissions");

const ops = {
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  not: (a, b) => a !== b,
  in: (a, b) => b.includes(a),
  equals: (a, b) =>
    typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b,
};

const isOperator = (value) =>
  value &&
  typeof value === "object" &&
  !(value instanceof Date) &&
  Object.keys(value).some((k) => k in ops);

const matches = (row, where = {}) =>
  Object.entries(where).every(([key, cond]) => {
    if (key === "OR") return cond.some((c) => matches(row, c));
    if (key === "AND") return cond.every((c) => matches(row, c));
    if (isOperator(cond))
      return Object.entries(cond).every(([op, v]) => (ops[op] ? ops[op](row[key], v) : true));
    if (cond && typeof cond === "object" && !(cond instanceof Date))
      return row[key] ? matches(row[key], cond) : false;
    return row[key] === cond;
  });

const createMemoryDb = () => {
  const db = {
    users: new Map(),
    roles: new Map(),
    permissions: new Map(),
    rolePermissions: [],
    sessions: new Map(),
    auditLogs: [],
    failAuditWrites: false,
  };

  const roleView = (role) =>
    role && {
      ...role,
      permissions: db.rolePermissions
        .filter((rp) => rp.roleId === role.id)
        .map((rp) => ({ permission: { name: db.permissions.get(rp.permissionId).name } })),
      _count: { users: [...db.users.values()].filter((u) => u.roleId === role.id).length },
    };

  const hydrate = (user) => {
    if (user) user.accessRole = roleView(db.roles.get(user.roleId)) || null;
    return user;
  };

  const roleByName = (name) => [...db.roles.values()].find((r) => r.name === name);
  const roleRows = (where = {}) =>
    [...db.roles.values()].filter((r) => matches(r, where)).map(roleView);

  const prisma = {
    user: {
      findUnique: async ({ where }) => hydrate(db.users.get(where.id)) || null,
      findFirst: async ({ where }) => {
        const email = where.email.equals.toLowerCase();
        return hydrate([...db.users.values()].find((u) => u.email.toLowerCase() === email)) || null;
      },
      findMany: async () => [...db.users.values()].map(hydrate),
      count: async ({ where } = {}) =>
        [...db.users.values()].map(hydrate).filter((u) => matches(u, where)).length,
      create: async ({ data }) => {
        const { accessRole, ...rest } = data;
        const role = accessRole && accessRole.connect ? roleByName(accessRole.connect.name) : null;
        if (accessRole && !role) throw Object.assign(new Error("role missing"), { code: "P2025" });
        const user = {
          id: `u${db.users.size + 1}`,
          isAdmin: false,
          tokenVersion: 0,
          failedLoginAttempts: 0,
          lockedUntil: null,
          roleId: role ? role.id : null,
          ...rest,
        };
        db.users.set(user.id, user);
        return hydrate(user);
      },
      update: async ({ where, data }) => {
        const user = db.users.get(where.id);
        if (!user) throw Object.assign(new Error("missing"), { code: "P2025" });
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === "object" && !(v instanceof Date) && "increment" in v)
            user[k] = (user[k] || 0) + v.increment;
          else user[k] = v;
        }
        return hydrate(user);
      },
      delete: async ({ where }) => {
        const user = db.users.get(where.id);
        if (!user) throw Object.assign(new Error("missing"), { code: "P2025" });
        db.users.delete(where.id);
        for (const [id, s] of db.sessions) if (s.userId === where.id) db.sessions.delete(id);
        return user;
      },
    },
    role: {
      findUnique: async ({ where }) =>
        roleView(where.id ? db.roles.get(where.id) : roleByName(where.name)) || null,
      findMany: async () => roleRows(),
      create: async ({ data }) => {
        const role = {
          id: crypto.randomUUID(),
          description: null,
          isProtected: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        db.roles.set(role.id, role);
        return roleView(role);
      },
      upsert: async ({ where, create }) => {
        const existing = roleByName(where.name);
        if (existing) return roleView(existing);
        return prisma.role.create({ data: create });
      },
      update: async ({ where, data }) => Object.assign(db.roles.get(where.id), data),
      delete: async ({ where }) => {
        db.roles.delete(where.id);
        db.rolePermissions = db.rolePermissions.filter((rp) => rp.roleId !== where.id);
      },
    },
    permission: {
      findMany: async ({ where } = {}) =>
        [...db.permissions.values()].filter((p) => matches(p, where)),
      createMany: async ({ data }) => {
        for (const row of data) {
          if (![...db.permissions.values()].some((p) => p.name === row.name)) {
            const permission = { id: crypto.randomUUID(), ...row };
            db.permissions.set(permission.id, permission);
          }
        }
      },
      deleteMany: async ({ where }) => {
        for (const p of [...db.permissions.values()]) {
          if (matches(p, where)) {
            db.permissions.delete(p.id);
            db.rolePermissions = db.rolePermissions.filter((rp) => rp.permissionId !== p.id);
          }
        }
      },
    },
    rolePermission: {
      createMany: async ({ data }) => {
        for (const row of data) {
          if (
            !db.rolePermissions.some(
              (rp) => rp.roleId === row.roleId && rp.permissionId === row.permissionId
            )
          ) {
            db.rolePermissions.push({ ...row });
          }
        }
      },
      deleteMany: async ({ where }) => {
        db.rolePermissions = db.rolePermissions.filter((rp) => !matches(rp, where));
      },
    },
    session: {
      create: async ({ data }) => {
        const session = {
          previousRefreshHash: null,
          rotatedAt: null,
          createdAt: new Date(),
          ...data,
        };
        db.sessions.set(session.id, session);
        return session;
      },
      findUnique: async ({ where, select }) => {
        const session = db.sessions.get(where.id);
        if (!session) return null;
        if (select && select.user)
          return { ...session, user: hydrate(db.users.get(session.userId)) || null };
        return session;
      },
      findMany: async ({ where }) =>
        [...db.sessions.values()]
          .filter((s) => matches(s, where))
          .sort((a, b) => b.lastActiveAt - a.lastActiveAt),
      updateMany: async ({ where, data }) => {
        const rows = [...db.sessions.values()].filter((s) => matches(s, where));
        rows.forEach((s) => Object.assign(s, data));
        return { count: rows.length };
      },
      deleteMany: async ({ where }) => {
        const rows = [...db.sessions.values()].filter((s) => matches(s, where));
        rows.forEach((s) => db.sessions.delete(s.id));
        return { count: rows.length };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        if (db.failAuditWrites) throw new Error("audit store down");
        const row = { id: crypto.randomUUID(), createdAt: new Date(), ...data };
        db.auditLogs.push(row);
        return row;
      },
      count: async ({ where } = {}) => db.auditLogs.filter((r) => matches(r, where)).length,
      findMany: async ({ where, skip = 0, take = 100 }) =>
        db.auditLogs
          .filter((r) => matches(r, where))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + take),
    },
  };

  const seedAccessControl = () => {
    for (const def of DEFAULT_ROLES) {
      const id = crypto.randomUUID();
      db.roles.set(id, {
        id,
        name: def.name,
        description: def.description,
        isProtected: def.isProtected,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    for (const p of CATALOG) {
      const id = crypto.randomUUID();
      db.permissions.set(id, { id, name: p.name, description: p.description });
    }
    const permissionId = (name) => [...db.permissions.values()].find((p) => p.name === name).id;
    for (const role of db.roles.values()) {
      for (const name of defaultPermissionsFor(role.name)) {
        db.rolePermissions.push({ roleId: role.id, permissionId: permissionId(name) });
      }
    }
  };

  const addUser = (overrides = {}) => {
    const { role, ...rest } = overrides;
    const roleName = role || (overrides.isAdmin ? "super_admin" : "user");
    const id = rest.id || `u${db.users.size + 1}`;
    const user = {
      id,
      name: "Test User",
      email: `${id}@example.com`,
      password: "x",
      isVerified: true,
      tokenVersion: 0,
      failedLoginAttempts: 0,
      lockedUntil: null,
      ...rest,
      roleId: roleByName(roleName).id,
    };
    db.users.set(id, user);
    return hydrate(user);
  };

  const addSession = (user, overrides = {}) => {
    const now = Date.now();
    const session = {
      id: crypto.randomUUID(),
      userId: user.id,
      refreshHash: "unused",
      previousRefreshHash: null,
      rotatedAt: null,
      expiresAt: new Date(now + 3600 * 1000),
      absoluteExpiresAt: new Date(now + 24 * 3600 * 1000),
      lastActiveAt: new Date(),
      createdAt: new Date(),
      ...overrides,
    };
    db.sessions.set(session.id, session);
    return session;
  };

  seedAccessControl();
  return { db, prisma, addUser, addSession, seedAccessControl, ALL_PERMISSIONS };
};

module.exports = { createMemoryDb };
