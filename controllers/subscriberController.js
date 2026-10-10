const subscriberService = require("../services/subscriberService");
const { sendEmail } = require("../config/mailer");
const { escapeHtml } = require("../utils/escapeHtml");
const { verifyUnsubscribeToken, buildUnsubscribeUrl } = require("../utils/unsubscribeToken");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

exports.subscribe = async (req, res) => {
  try {
    const rawEmail = req.body && req.body.email;
    if (rawEmail !== undefined && typeof rawEmail !== "string")
      return res.status(400).json({ msg: "Please enter a valid email address." });
    const email = (rawEmail || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ msg: "Email is required!" });
    if (email.length > 254 || !EMAIL_REGEX.test(email))
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
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <hr />
          <p style="font-size: 12px; color: #999;">Check your admin dashboard for the full subscriber list.</p>
        </div>
      `;
      await sendEmail(process.env.EMAIL_FROM, "New Newsletter Subscriber", emailHtml);
      console.log("Admin notification sent");
    } catch (mailErr) {
      console.error("Admin notification failed:", mailErr.message);
    }

    try {
      await sendEmail(
        email,
        "You're subscribed",
        `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <p>Thank you for subscribing to our newsletter.</p>
          <p style="font-size: 12px; color: #777;">
            Changed your mind? <a href="${escapeHtml(buildUnsubscribeUrl(email))}">Unsubscribe</a>.
          </p>
        </div>`
      );
    } catch (mailErr) {
      console.error("Subscriber confirmation failed:", mailErr.message);
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
    const rawEmail = req.query.email || (req.body && req.body.email);
    const token = req.query.token || (req.body && req.body.token);
    if (typeof rawEmail !== "string" || typeof token !== "string") {
      return res.status(400).json({ msg: "A valid unsubscribe link is required." });
    }
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email) || !verifyUnsubscribeToken(email, token)) {
      return res.status(400).json({ msg: "This unsubscribe link is invalid." });
    }

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
    // Each entry carries its own signed unsubscribe link for use in newsletters.
    res.status(200).json(
      subscribers.map((sub) => ({
        ...sub,
        unsubscribeUrl: sub.email ? buildUnsubscribeUrl(sub.email) : null,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Internal server error" });
  }
};
