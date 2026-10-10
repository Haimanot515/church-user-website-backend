const express = require("express");
const { sendEmail } = require("../config/mailer");
const router = express.Router();
const protect = require("../middleware/protect");
const { requireReauth } = require("../middleware/reauth");
const { P } = require("../config/permissions");
const prisma = require("../prisma/prisma.service");
const accessService = require("../services/accessService");
const sessionService = require("../services/sessionService");
const auditService = require("../services/auditService");
const { resolvePermissions } = require("../utils/access");
const { sendAdminError, httpError } = require("../utils/adminError");
const pick = require("../utils/pick");
const { escapeHtmlWithBreaks } = require("../utils/escapeHtml");
const { parsePagination, parseLimit } = require("../utils/pagination");

const presentUser = (user) => {
  const permissions = resolvePermissions(user.accessRole);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.accessRole ? user.accessRole.name : "user",
    isAdmin: permissions.length > 0,
  };
};

router.get("/users", ...protect(P.USER_READ, "User", { audit: false }), async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.slice(0, 100) : "";
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [totalUsers, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          accessRole: accessService.USER_ACCESS_SELECT.accessRole,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      users: users.map(presentUser),
      totalUsers,
      page,
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.put("/users/:id", ...protect(P.USER_UPDATE, "User", { audit: false }), async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.body && (req.body.role !== undefined || req.body.isAdmin !== undefined)) {
      return res.status(400).json({
        success: false,
        msg: "Roles are changed with PUT /api/admin/users/:id/role.",
        code: "use_role_endpoint",
      });
    }
    const updatedData = pick(req.body, ["name", "isVerified"]);

    if (
      updatedData.name !== undefined &&
      (typeof updatedData.name !== "string" || updatedData.name.trim().length < 2)
    ) {
      return res.status(400).json({ success: false, msg: "Name must be at least 2 characters." });
    }
    if (updatedData.isVerified !== undefined) {
      if (updatedData.isVerified === "true") updatedData.isVerified = true;
      if (updatedData.isVerified === "false") updatedData.isVerified = false;
      if (typeof updatedData.isVerified !== "boolean") {
        return res.status(400).json({ success: false, msg: "isVerified must be true or false." });
      }
    }
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ success: false, msg: "No valid fields to update." });
    }
    if (updatedData.name !== undefined) updatedData.name = updatedData.name.trim();

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: accessService.USER_ACCESS_SELECT,
    });
    if (!target) return res.status(404).json({ success: false, msg: "User not found" });
    accessService.assertCanManageUser(req.user, target);

    const before = { name: target.name, isVerified: target.isVerified };
    updatedData.updatedAt = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
      select: { ...accessService.USER_ACCESS_SELECT, createdAt: true, updatedAt: true },
    });

    const diff = {};
    for (const key of Object.keys(updatedData)) {
      if (key !== "updatedAt" && before[key] !== updatedUser[key])
        diff[key] = { from: before[key], to: updatedUser[key] };
    }
    await auditService.event(req, "user.update", {
      entity: "User",
      entityId: userId,
      targetUserId: userId,
      diff,
    });

    res.json({
      success: true,
      msg: "User updated successfully",
      updatedUser: presentUser(updatedUser),
    });
  } catch (err) {
    sendAdminError(res, err, "Update user");
  }
});

router.put(
  "/users/:id/role",
  ...protect(P.USER_ROLE_ASSIGN, "User", { audit: false }),
  requireReauth,
  async (req, res) => {
    try {
      const { target, from, to } = await accessService.changeUserRole(
        req.user,
        req.params.id,
        (req.body || {}).role
      );
      await auditService.event(req, "user.role_change", {
        severity: "critical",
        entity: "User",
        entityId: target.id,
        targetUserId: target.id,
        diff: { role: { from, to } },
      });
      res.json({
        success: true,
        msg: "Role updated successfully",
        user: { id: target.id, role: to },
      });
    } catch (err) {
      sendAdminError(res, err, "Change role");
    }
  }
);

router.post(
  "/users/:id/logout",
  ...protect(P.USER_FORCE_LOGOUT, "User", { audit: false }),
  async (req, res) => {
    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: accessService.USER_ACCESS_SELECT,
      });
      if (!target) return res.status(404).json({ success: false, msg: "User not found" });
      accessService.assertCanManageUser(req.user, target);

      const revoked = await sessionService.revokeAllForUser(target.id);
      await auditService.event(req, "user.force_logout", {
        severity: "warning",
        entity: "User",
        entityId: target.id,
        targetUserId: target.id,
        metadata: { sessionsRevoked: revoked },
      });
      res.json({ success: true, msg: "User signed out everywhere.", sessionsRevoked: revoked });
    } catch (err) {
      sendAdminError(res, err, "Force logout");
    }
  }
);

router.delete(
  "/delete/:id",
  ...protect(P.USER_DELETE, "User", { audit: false }),
  requireReauth,
  async (req, res) => {
    try {
      const userId = req.params.id;

      if (userId === req.user.id) {
        return res.status(400).json({ success: false, msg: "You cannot delete your own account." });
      }

      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: accessService.USER_ACCESS_SELECT,
      });
      if (!target) return res.status(404).json({ success: false, msg: "User not found" });
      accessService.assertCanManageUser(req.user, target);
      await accessService.assertNotLastSuperAdmin(target);

      await prisma.user.delete({ where: { id: userId } }).catch((err) => {
        if (err.code === "P2003")
          throw httpError(409, "User still owns posts, media or church assignments.");
        throw err;
      });

      await auditService.event(req, "user.delete", {
        severity: "critical",
        entity: "User",
        entityId: userId,
        targetUserId: userId,
        metadata: {
          deletedEmail: target.email,
          deletedRole: target.accessRole ? target.accessRole.name : "user",
        },
      });
      res.json({ success: true, msg: "User deleted successfully" });
    } catch (err) {
      sendAdminError(res, err, "Delete user");
    }
  }
);

router.get("/threads", ...protect(P.MESSAGE_READ, "Thread"), async (req, res) => {
  const limit = parseLimit(req.query.limit, { defaultLimit: 20, maxLimit: 100 });
  const cursor = req.query.cursor;
  const cursorDate = cursor ? new Date(cursor) : null;
  if (cursorDate && Number.isNaN(cursorDate.getTime())) {
    return res.status(400).json({ success: false, msg: "Invalid cursor" });
  }
  const where = cursorDate ? { lastMessageAt: { lt: cursorDate } } : {};

  try {
    const threads = await prisma.thread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });

    const nextCursor = threads.length > 0 ? threads[threads.length - 1].lastMessageAt : null;

    res.json({ success: true, threads, nextCursor });
  } catch (err) {
    console.error("Get threads error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

router.get("/messages/:threadId", ...protect(P.MESSAGE_READ, "Thread"), async (req, res) => {
  const limit = parseLimit(req.query.limit, { defaultLimit: 20, maxLimit: 100 });
  const cursor = req.query.cursor;
  const { threadId } = req.params;

  const where = { threadId };
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (Number.isNaN(cursorDate.getTime())) {
      return res.status(400).json({ success: false, msg: "Invalid cursor" });
    }
    where.createdAt = { lt: cursorDate };
  }

  try {
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const nextCursor = messages.length ? messages[messages.length - 1].createdAt : null;

    const thread = await prisma.thread
      .update({
        where: { id: threadId },
        data: { unreadForAdmin: 0 },
      })
      .catch(() => null);

    res.json({ success: true, messages, nextCursor, thread });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ success: false, msg: "Failed to fetch messages" });
  }
});

router.post(
  "/reply",
  ...protect(P.MESSAGE_REPLY, "Thread", {
    action: "message.reply",
    entityId: (req) => req.body && req.body.threadId,
  }),
  async (req, res) => {
    const { threadId, message, clientId } = req.body;

    if (
      typeof threadId !== "string" ||
      typeof message !== "string" ||
      !threadId ||
      !message.trim()
    ) {
      return res.status(400).json({ success: false, msg: "threadId and message are required" });
    }
    if (message.length > 5000) {
      return res.status(400).json({ success: false, msg: "Message is too long" });
    }
    if (clientId !== undefined && clientId !== null && typeof clientId !== "string") {
      return res.status(400).json({ success: false, msg: "Invalid clientId" });
    }

    try {
      const adminMsg = await prisma.message.create({
        data: {
          threadId,
          message,
          fromAdmin: true,
          clientId,
        },
      });

      const thread = await prisma.thread
        .update({
          where: { id: threadId },
          data: {
            lastMessage: message,
            lastMessageAt: adminMsg.createdAt,
          },
        })
        .catch((err) => {
          if (err.code === "P2025") return null;
          throw err;
        });

      if (!thread) {
        return res.status(404).json({ success: false, msg: "Thread not found" });
      }

      const emailHtml = `
      <div style="font-family: sans-serif; color: #333;">
        <p>${escapeHtmlWithBreaks(message)}</p>
        <br />
        <hr />
        <p style="font-size: 12px; color: #777;">⚠️ Please do not reply to this email. This inbox is not monitored.</p>
      </div>
    `;

      await sendEmail(thread.userEmail, "Reply from Admin", emailHtml);

      res.status(201).json({ success: true, adminMsg, thread });
    } catch (err) {
      console.error("Error in /admin/reply:", err);
      res.status(500).json({ success: false, msg: "Server error" });
    }
  }
);

router.get("/unread-users-count", ...protect(P.MESSAGE_READ, "Thread"), async (req, res) => {
  try {
    const result = await prisma.thread.aggregate({
      _sum: { unreadForAdmin: true },
    });

    res.json({ success: true, count: result._sum.unreadForAdmin || 0 });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
