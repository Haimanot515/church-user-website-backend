const express = require("express");
// Changed: importing the sendEmail function from your Brevo-based config
const { sendEmail } = require("../config/nodemailer");
const router = express.Router(); 
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const User = require("../models/User");
const Thread = require("../models/Thread");
const Message = require("../models/Message");

// ==================== GET ALL USERS ====================
router.get("/users", auth, adminAuth, async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      const regex = new RegExp(search, "i");
      query = { $or: [{ name: regex }, { email: regex }] };
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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

    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
      new: true,
      runValidators: true,
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

    const user = await User.findByIdAndDelete(userId);

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
  const filter = cursor ? { lastMessageAt: { $lt: new Date(cursor) } } : {};

  try {
    const threads = await Thread.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(limit);

    const nextCursor = threads.length > 0 ? threads[threads.length - 1].lastMessageAt : null;

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

  const filter = { threadId };
  if (cursor) {
    filter.createdAt = { $lt: new Date(cursor) }; 
  }

  try {
    const messages = await Message.find(filter)
      .sort({ createdAt: 1 }) 
      .limit(limit);

    const nextCursor = messages.length ? messages[messages.length - 1].createdAt : null;
    
    const thread = await Thread.findOneAndUpdate( { _id: threadId }, {unreadForAdmin:0} );

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
    return res.status(400).json({ success: false, msg: "threadId and message are required" });
  }

  try {
    const adminMsgDoc = await Message.create({
      threadId,
      message,
      fromAdmin: true,
      clientId,
    });
    const adminMsg = adminMsgDoc.toObject();

    const thread = await Thread.findByIdAndUpdate(
      threadId,
      {
        lastMessage: message,
        lastMessageAt: adminMsg.createdAt,
      },
      { new: true }
    );

    if (!thread) {
      return res.status(404).json({ success: false, msg: "Thread not found" });
    }

    // ✅ Using the Brevo sendEmail function instead of transporter.sendMail
    const emailHtml = `
      <div style="font-family: sans-serif; color: #333;">
        <p>${message}</p>
        <br />
        <hr />
        <p style="font-size: 12px; color: #777;">⚠️ Please do not reply to this email. This inbox is not monitored.</p>
      </div>
    `;

    await sendEmail(
      thread.userEmail,
      "Reply from Admin",
      emailHtml
    );

    res.status(201).json({ success: true, adminMsg, thread });

  } catch (err) {
    console.error("Error in /admin/reply:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ==================== UNREAD USERS COUNT ====================
router.get("/unread-users-count", auth, adminAuth, async (req, res) => {
  try {
    const result = await Thread.aggregate([
      { $group: { _id: null, count: { $sum: "$unreadForAdmin" } } },
    ]);

    res.json({ success: true, count: result[0]?.count || 0 });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
