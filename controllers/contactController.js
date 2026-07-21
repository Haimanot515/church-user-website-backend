const Thread = require("../models/Thread");
const Message = require("../models/Message");
// Import the sendEmail function from your Brevo config file
const { sendEmail } = require("../config/nodemailer"); 

exports.createThread = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ msg: "All fields are required!" });

    // Find existing thread
    let thread = await Thread.findOne({ userEmail: email });

    // If thread doesn't exist, create it
    if (!thread) {
      thread = await Thread.create({
        userName: name,
        userEmail: email,
        unreadForAdmin: 0, // start at 0, we will increment below
      });
    }

    // Save the message
    const newMessage = await Message.create({
      threadId: thread._id,
      message,
      fromAdmin: false,
      createdAt: new Date(),
    });

    // Update thread
    thread.lastMessage = message;
    thread.lastMessageAt = new Date();

    // Increment unread only if message is from user (not admin)
    thread.unreadForAdmin += 1;

    await thread.save();

    // --- BREVO NOTIFICATION LOGIC (Fixes transporter.sendMail error) ---
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #007bff;">New Message from ${name}</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong> ${message}</p>
          <hr />
          <p style="font-size: 12px; color: #999;">Check your portfolio admin dashboard to reply.</p>
        </div>
      `;

      await sendEmail(
        process.env.EMAIL_FROM, // Sends notification TO you
        `Portfolio: New Message from ${name}`,
        emailHtml
      );
      console.log("✅ Admin notification sent via Brevo");
    } catch (mailErr) {
      console.error("🔥 Brevo Notification failed:", mailErr.message);
      // We don't return an error to the user because the message was saved successfully
    }
    // ------------------------------------------------------------------

    res.status(201).json({
      msg: "Message received",
      threadId: thread._id,
      messageId: newMessage._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error" });
  }
};
