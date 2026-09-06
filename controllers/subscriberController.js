const subscriberService = require("../services/subscriberService");
const { sendEmail } = require("../config/nodemailer");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

exports.subscribe = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email)
      return res.status(400).json({ msg: "Email is required!" });
    if (!EMAIL_REGEX.test(email))
      return res.status(400).json({ msg: "Please enter a valid email address." });

    let subscriber = await subscriberService.findByEmail(email);

    if (subscriber) {
      if (subscriber.active) {
        return res.status(409).json({ msg: "This email is already subscribed." });
      }
      subscriber = await subscriberService.reactivate(subscriber.id);
    } else {
      subscriber = await subscriberService.create(email);
    }

    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #007bff;">New Newsletter Subscriber</h2>
          <p><strong>Email:</strong> ${email}</p>
          <hr />
          <p style="font-size: 12px; color: #999;">Check your admin dashboard for the fullsubscriber list.</p>
        </div>
      `;
      await sendEmail(
        process.env.EMAIL_FROM,
        "New Newsletter Subscriber",
        emailHtml
      );
      console.log("Admin notification sent via Brevo");
    } catch (mailErr) {
      console.error("Brevo Notification failed:", mailErr.message);
    }

    res.status(201).json({
      msg: "Subscribed successfully",
      subscriberId: subscriber.id,
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

    const subscriber = await subscriberService.findByEmail(email);
    if (!subscriber || !subscriber.active) {
      return res.status(404).json({ msg: "No active subscription found for that email." });
    }

    await subscriberService.deactivate(subscriber.id);
    res.status(200).json({ msg: "Unsubscribed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error" });
  }
};

exports.getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await subscriberService.getAllActive();
    res.status(200).json(subscribers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error" });
  }
};
