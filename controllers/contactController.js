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
      // Same visual language as authController's verification email:
      // sky gradient bg, navy hero band w/ gold cross accent, gold eyebrow
      // labels, section-cross-divider, deep-red cross-pattern closing banner.
      const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media screen and (max-width: 480px) {
            .card { width: 100% !important; border-radius: 0 !important; }
            .hero-h1 { font-size: 26px !important; letter-spacing: -1px !important; }
            .come-as-you-are { font-size: 22px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(180deg, #a9d3e8 0%, #d5eaf3 40%, #f3f8fa 100%); font-family: 'Nunito Sans', 'Segoe UI', Arial, sans-serif;">
        <center style="width: 100%; padding: 40px 0;">
          <div class="card" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 30px rgba(15,36,56,0.15);">

            <!-- Hero band, same gradient + hanging-cross accent as authController -->
            <div style="padding: 44px 30px 32px 30px; text-align: center; background: linear-gradient(180deg, #1c3a52 0%, #0f2438 100%);">
              <svg width="27" height="38" viewBox="0 0 27 38" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 18px;">
                <rect x="11" y="0" width="4" height="38" fill="#cf9f3f" />
                <rect x="2" y="9" width="22" height="4" fill="#cf9f3f" />
              </svg>

              <h1 class="hero-h1" style="
                font-family: Georgia, 'Cormorant Garamond', serif;
                font-size: 28px;
                line-height: 1.2;
                margin: 0;
                letter-spacing: -1px;
                color: #eaf3f8;
                font-weight: 700;
              ">
                New Message Received
              </h1>
            </div>

            <!-- Eyebrow label + message details -->
            <div style="padding: 40px 40px 8px 40px; text-align: center;">
              <span style="
                font-family: 'IBM Plex Mono', monospace;
                font-size: 11px;
                font-weight: 500;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: #cf9f3f;
              ">Contact Form</span>

              <p style="font-size: 16px; color: #1c3a52; margin: 18px 0 4px 0; text-align: left;">
                <strong>From:</strong> ${name}
              </p>
              <p style="font-size: 15px; color: #3d5a6c; margin: 4px 0 20px 0; text-align: left;">
                <strong>Email:</strong> ${email}
              </p>

              <div style="margin: 0 0 26px 0; padding: 20px; background-color: #f3f8fa; border: 1px solid #d5eaf3; border-radius: 8px; text-align: left;">
                <span style="font-size: 15px; color: #0f2438; line-height: 1.6; white-space: pre-wrap;">${message}</span>
              </div>
            </div>

            <!-- Sermon-divider crosses, same three SVGs as authController -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 14px; padding: 10px 0 34px 0;">
              <svg width="14" height="20" viewBox="0 0 16 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="0" width="4" height="24" fill="#cf9f3f" opacity="0.7" />
                <rect x="0" y="5" width="16" height="4" fill="#cf9f3f" opacity="0.7" />
              </svg>
              <svg width="19" height="27" viewBox="0 0 22 32" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="0" width="4" height="32" fill="#cf9f3f" />
                <rect x="1" y="12" width="20" height="4" fill="#cf9f3f" />
              </svg>
              <svg width="14" height="20" viewBox="0 0 16 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="0" width="4" height="24" fill="#cf9f3f" opacity="0.7" />
                <rect x="0" y="5" width="16" height="4" fill="#cf9f3f" opacity="0.7" />
              </svg>
            </div>

            <!-- Closing banner: same deep-red + cross-pattern bg as authController -->
            <div style="
              background-color: #7a1010;
              background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Crect x='36' y='14' width='8' height='52'/%3E%3Crect x='18' y='30' width='44' height='8'/%3E%3C/g%3E%3C/svg%3E&quot;);
              background-repeat: repeat;
              padding: 34px 30px;
              text-align: center;
            ">
              <p class="come-as-you-are" style="
                font-family: Georgia, 'Cormorant Garamond', serif;
                font-size: 22px;
                font-weight: 700;
                color: #ffffff;
                margin: 0;
                line-height: 1.3;
              ">
                Check your admin dashboard to reply.
              </p>
            </div>

            <div style="background-color: #f3f8fa; padding: 22px; text-align: center;">
              <p style="font-size: 12px; color: #6a8296; margin: 0;">&copy; ${new Date().getFullYear()} Our Church</p>
              <p style="font-size: 11px; color: #9db3c0; margin: 5px 0 0 0; font-weight: 600;">This is an automated message - please do not reply to this email.</p>
            </div>
          </div>
        </center>
      </body>
      </html>
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