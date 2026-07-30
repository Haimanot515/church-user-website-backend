const User = require("../models/User");
const VerificationCode = require("../models/VerificationCode");
const HomeHero = require("../models/homeHero");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Updated to use your Brevo SDK configuration
const { sendEmail } = require("../config/nodemailer");

/* ===========================
    REGISTER (SEND CODE)
=========================== */
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ msg: "Password must be at least 6 characters." });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists." });
    }

    // 3. Dynamic Title & Image from your Hero model
    const heroData = await HomeHero.findOne().sort({ createdAt: -1 });
    const displayLogo = heroData && heroData.image ? heroData.image : "https://res.cloudinary.com/dq3jkpys8/image/upload/v1770377714/home_hero/i6vhbionblsgudwkywqb.jpg";

    // 4. DROP Logic: Clear any previous unused codes for this email
    await VerificationCode.deleteMany({ email, used: false });

    // 5. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 6. Store code in DB with 10-minute expiry
    await VerificationCode.create({
      email,
      DBcode: code,
      used: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // 7. Church-themed HTML email, matching Home.jsx / Home.css palette:
    //    navy (#1c3a52 / #0f2438), gold (#cf9f3f), Cormorant Garamond
    //    for display type, Nunito Sans for body, IBM Plex Mono for the
    //    small eyebrow/label text, plus a simple gold cross accent.
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media screen and (max-width: 480px) {
          .card { width: 100% !important; border-radius: 0 !important; }
          .main-h1 { font-size: 32px !important; letter-spacing: -1px !important; }
          .otp { font-size: 26px !important; letter-spacing: 4px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #d5eaf3; font-family: 'Nunito Sans', 'Segoe UI', Arial, sans-serif;">
      <center style="width: 100%; background-color: #d5eaf3; padding: 40px 0;">
        <div class="card" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e3edf2; border-radius: 12px; overflow: hidden;">

          <div style="padding: 40px 30px 30px 30px; text-align: center; background: linear-gradient(180deg, #1c3a52 0%, #0f2438 100%);">
            <img src="${displayLogo}" style="width: 64px; height: 64px; border-radius: 10px; object-fit: cover; margin-bottom: 22px; border: 2px solid #cf9f3f;" />

            <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 18px;">
              <rect x="13" y="0" width="4" height="42" fill="#cf9f3f" />
              <rect x="2" y="15" width="26" height="4" fill="#cf9f3f" />
            </svg>

            <h1 class="main-h1" style="
              font-family: Georgia, 'Cormorant Garamond', serif;
              font-size: 40px;
              line-height: 1.1;
              margin: 0;
              letter-spacing: -1px;
              color: #eaf3f8;
              font-weight: 700;
            ">
              Verify your account
            </h1>
          </div>

          <div style="padding: 36px 40px 40px 40px; text-align: center;">
            <p style="font-size: 16px; color: #1c3a52;">Peace be with you, <strong>${name}</strong>,</p>
            <p style="font-size: 15px; color: #3d5a6c; line-height: 1.6;">
              Use the verification code below to confirm your account and continue joining our church family online.
            </p>

            <div style="margin: 30px 0; padding: 20px; background-color: #f3f8fa; border: 1px solid #d5eaf3; border-radius: 8px; display: inline-block;">
              <span class="otp" style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0f2438; font-family: 'IBM Plex Mono', monospace;">${code}</span>
            </div>

            <p style="font-size: 13px; color: #94a9b6; margin-top: 20px;">
              This code expires in 10 minutes.
            </p>
          </div>

          <div style="background-color: #f3f8fa; padding: 25px; border-top: 1px solid #e3edf2; text-align: center;">
            <p style="font-size: 12px; color: #6a8296; margin: 0;">&copy; ${new Date().getFullYear()} Our Church</p>
            <p style="font-size: 11px; color: #9db3c0; margin: 5px 0 0 0; font-weight: 600;">This is an automated message - please do not reply to this email.</p>
          </div>
        </div>
      </center>
    </body>
    </html>
    `;

    // 8. Send via Brevo API
    await sendEmail(
      email,
      "Verify your account - Our Church",
      htmlContent
    );

    res.json({ msg: "Verification code sent to your email." });

  } catch (err) {
    console.error("Registration/Brevo Error:", err);
    res.status(500).json({ msg: "Server error during registration." });
  }
};

/* ===========================
    VERIFY CODE & CREATE USER
=========================== */
exports.verify = async (req, res) => {
  try {
    const { code, email, name, password } = req.body;

    if (!code || !email || !name || !password) {
      return res.status(400).json({ msg: "All fields are required." });
    }

    const record = await VerificationCode.findOne({
      email,
      DBcode: code,
      used: false,
    });

    if (!record) {
      return res.status(400).json({ msg: "Invalid or already used code." });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ msg: "Verification code expired." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ msg: "User already registered." });
    }

    record.used = true;
    await record.save();

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isVerified: true,
    });

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      msg: "Registration successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
    });
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ msg: "Server error during verification." });
  }
};

/* ===========================
    LOGIN
=========================== */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    if (!user.isVerified) {
      return res.status(403).json({ msg: "Please verify your email first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Invalid password." });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ msg: "Server error during login." });
  }
};