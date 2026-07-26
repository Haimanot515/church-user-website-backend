const Subscriber = require("../models/Subscriber");
// Import the sendEmail function from your Brevo config file
const { sendEmail } = require("../config/nodemailer");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

exports.subscribe = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();

    if (!email)
      return res.status(400).json({ msg: "Email is required!" });
    if (!EMAIL_REGEX.test(email))
      return res.status(400).json({ msg: "Please enter a valid email address." });

    // Find existing subscriber
    let subscriber = await Subscriber.findOne({ email });

    if (subscriber) {
      if (subscriber.active) {
        return res.status(409).json({ msg: "This email is already subscribed." });
      }
      // Re-subscribe someone who previously unsubscribed
      subscriber.active = true;
      subscriber.subscribedAt = new Date();
      subscriber.unsubscribedAt = null;
      await subscriber.save();
    } else {
      subscriber = await Subscriber.create({
        email,
        active: true,
        subscribedAt: new Date(),
      });
    }

    // --- BREVO NOTIFICATION LOGIC ---
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #007bff;">New Newsletter Subscriber</h2>
          <p><strong>Email:</strong> ${email}</p>
          <hr />
          <p style="font-size: 12px; color: #999;">Check your admin dashboard for the full subscriber list.</p>
        </div>
      `;

      await sendEmail(
        process.env.EMAIL_FROM, // Sends notification TO you
        "New Newsletter Subscriber",
        emailHtml
      );
      console.log("✅ Admin notification sent via Brevo");
    } catch (mailErr) {
      console.error("🔥 Brevo Notification failed:", mailErr.message);
      // We don't return an error to the user because the subscriber was saved successfully
    }
    // ------------------------------------------------------------------

    res.status(201).json({
      msg: "Subscribed successfully",
      subscriberId: subscriber._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error" });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const email = (req.query.email || req.body.email || "").trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email))
      return res.status(400).json({ msg: "A valid email address is required." });

    const subscriber = await Subscriber.findOne({ email });

    if (!subscriber || !subscriber.active) {
      return res.status(404).json({ msg: "No active subscription found for that email." });
    }

    subscriber.active = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.status(200).json({ msg: "Unsubscribed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error" });
  }
};

exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find({ active: true }).sort({ subscribedAt: -1 });
    res.status(200).json(subscribers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error" });
  }
};