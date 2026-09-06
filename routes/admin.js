const express = require("express");
const { sendEmail } = require("../config/nodemailer");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const prisma = require("../prisma/prisma.service");

// ==================== GET ALL USERS ====================
router.get("/users", auth, adminAuth, async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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
          role: true,
          isAdmin: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      users,
      totalUsers,
      page,
      totalPages: Math.ceil(totalUsers / limit),
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ==================== UPDATE USER ====================
router.put("/users/:id", auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const updatedData = { ...req.body };
    delete updatedData.password;

    const updatedUser = await prisma.user
      .update({ where: { id: userId }, data: updatedData })
      .catch((err) => {
        if (err.code === "P2025") return null;
        throw err;
      });

    if (!updatedUser) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.json({ success: true, msg: "User updated successfully", updatedUser });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ==================== DELETE USER ====================
router.delete("/delete/:id", auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await prisma.user
      .delete({ where: { id: userId } })
      .catch((err) => {
        if (err.code === "P2025") return null;
        throw err;
      });

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.json({ success: true, msg: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ==================== GET THREADS ====================
router.get("/threads", auth, adminAuth, async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const cursor = req.query.cursor;
  const where = cursor ? { lastMessageAt: { lt: new Date(cursor) } } : {};

  try {
    const threads = await prisma.thread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });

    const nextCursor =
      threads.length > 0 ? threads[threads.length - 1].lastMessageAt : null;

    res.json({ success: true, threads, nextCursor });
  } catch (err) {
    console.error("Get threads error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ==================== GET MESSAGES ====================
router.get("/messages/:threadId", async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const cursor = req.query.cursor;
  const { threadId } = req.params;

  const where = { threadId };
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  try {
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const nextCursor = messages.length
      ? messages[messages.length - 1].createdAt
      : null;

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

// ==================== REPLY (Adjusted for Brevo) ====================
router.post("/reply", auth, adminAuth, async (req, res) => {
  const { threadId, message, clientId } = req.body;

  if (!threadId || !message) {
    return res
      .status(400)
      .json({ success: false, msg: "threadId and message are required" });
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
        <p>${message}</p>
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
});

// ==================== UNREAD USERS COUNT ====================
router.get("/unread-users-count", auth, adminAuth, async (req, res) => {
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
