const User = require("../models/User");
const VerificationCode = require("../models/VerificationCode");
const HomeHero = require("../models/homeHero");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Updated to use your Brevo SDK configuration
const { sendEmail } = require("../config/nodemailer");

/* ===========================
    VALIDATION HELPERS
=========================== */

// Simple, widely-used email shape check — not a full RFC 5322 validator,
// but enough to catch obviously malformed input (missing @, no domain, etc).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password rule: at least 8 characters, at least 1 uppercase letter,
// at least 1 lowercase letter, and at least 1 special character.
const PASSWORD_MIN_LENGTH = 8;
const hasUppercase = (value) => /[A-Z]/.test(value);
const hasLowercase = (value) => /[a-z]/.test(value);
const hasSpecialChar = (value) => /[^A-Za-z0-9]/.test(value);

const validateRegistrationInput = ({ name, email, password }) => {
  if (!name || !email || !password) {
    return "All fields are required.";
  }

  if (typeof name !== "string" || name.trim().length < 2) {
    return "Name must be at least 2 characters.";
  }

  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return "Please enter a valid email address.";
  }

  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (!hasUppercase(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!hasLowercase(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!hasSpecialChar(password)) {
    return "Password must contain at least one special character.";
  }

  return null; // no errors
};

/* ===========================
    REGISTER (SEND CODE)
=========================== */
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Validation — name, email format, and password strength
    const validationError = validateRegistrationInput({ name, email, password });
    if (validationError) {
      return res.status(400).json({ msg: validationError });
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

    // 7. HTML email built directly from Home.jsx / Home.css, expanded
    //    into a longer, section-by-section page mirroring more of the
    //    actual home page layout and design tokens:
    //    - sky gradient background (--sky-top → --sky-mid → --sky-low)
    //    - hero band: navy gradient, hanging-cross accent, hero tagline
    //    - eyebrow label styling (IBM Plex Mono, gold, uppercase)
    //    - OTP card
    //    - sermon-divider crosses
    //    - "From the Priest"-style quote block (Cormorant Garamond italic)
    //    - section-cross-divider
    //    - cross-bg deep-red closing banner, same repeating cross
    //      pattern background and copy as the bottom of Home.jsx
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media screen and (max-width: 480px) {
          .card { width: 100% !important; border-radius: 0 !important; }
          .hero-h1 { font-size: 28px !important; letter-spacing: -1px !important; }
          .otp { font-size: 26px !important; letter-spacing: 4px !important; }
          .come-as-you-are { font-size: 22px !important; }
          .quote-text { font-size: 18px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(180deg, #a9d3e8 0%, #d5eaf3 40%, #f3f8fa 100%); font-family: 'Nunito Sans', 'Segoe UI', Arial, sans-serif;">
      <center style="width: 100%; padding: 40px 0;">
        <div class="card" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 30px rgba(15,36,56,0.15);">

          <!-- Hero band, same gradient + hanging-cross accent + tagline as Home.jsx -->
          <div style="padding: 50px 30px 36px 30px; text-align: center; background: linear-gradient(180deg, #1c3a52 0%, #0f2438 100%);">
            <img src="${displayLogo}" style="width: 64px; height: 64px; border-radius: 10px; object-fit: cover; margin-bottom: 20px; border: 2px solid #cf9f3f;" />

            <svg width="27" height="38" viewBox="0 0 27 38" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 18px;">
              <rect x="11" y="0" width="4" height="38" fill="#cf9f3f" />
              <rect x="2" y="9" width="22" height="4" fill="#cf9f3f" />
            </svg>

            <h1 class="hero-h1" style="
              font-family: Georgia, 'Cormorant Garamond', serif;
              font-size: 32px;
              line-height: 1.15;
              margin: 0 0 14px 0;
              letter-spacing: -1px;
              color: #eaf3f8;
              font-weight: 700;
            ">
              Rooted in grace,<br/>reaching toward the light
            </h1>
            <p style="font-size: 14px; color: #a9c2d3; margin: 0; line-height: 1.6;">
              Reflections, sermon notes, and stories from our congregation<br/>as we walk through Scripture together, week by week.
            </p>
          </div>

          <!-- Eyebrow label + OTP card -->
          <div style="padding: 40px 40px 8px 40px; text-align: center;">
            <span style="
              font-family: 'IBM Plex Mono', monospace;
              font-size: 11px;
              font-weight: 500;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #cf9f3f;
            ">Account Verification</span>

            <p style="font-size: 16px; color: #1c3a52; margin: 18px 0 4px 0;">Hello <strong>${name}</strong>,</p>
            <p style="font-size: 15px; color: #3d5a6c; line-height: 1.6;">
              Use the verification code below to confirm your account.
            </p>

            <div style="margin: 26px 0; padding: 20px; background-color: #f3f8fa; border: 1px solid #d5eaf3; border-radius: 8px; display: inline-block;">
              <span class="otp" style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0f2438; font-family: 'IBM Plex Mono', monospace;">${code}</span>
            </div>

            <p style="font-size: 13px; color: #94a9b6; margin: 0 0 8px 0;">
              This code expires in 10 minutes.
            </p>
          </div>

          <!-- Sermon-divider crosses, same three SVGs as Home.jsx -->
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

          <!-- "From the Priest"-style quote block -->
          <div style="padding: 0 40px 44px 40px; text-align: center;">
            <span style="
              font-family: 'IBM Plex Mono', monospace;
              font-size: 11px;
              font-weight: 500;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #cf9f3f;
            ">From the Priest</span>
            <p class="quote-text" style="
              font-family: Georgia, 'Cormorant Garamond', serif;
              font-style: italic;
              font-weight: 600;
              font-size: 20px;
              line-height: 1.55;
              color: #0f2438;
              margin: 14px 0 0 0;
            ">
              "Twenty years in ministry has taught me that faith grows best in community. Welcome — we're glad you're here."
            </p>
          </div>

          <!-- section-cross-divider, same three-cross pattern as Home.jsx -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 22px; padding: 0 30px 40px 30px;">
            <span style="flex: 1; height: 2px; max-width: 90px; background: linear-gradient(90deg, rgba(207,159,63,0) 0%, rgba(207,159,63,0.55) 100%);"></span>
            <svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="11" y="0" width="4" height="38" fill="#cf9f3f" />
              <rect x="2" y="9" width="22" height="4" fill="#cf9f3f" />
            </svg>
            <span style="flex: 1; height: 2px; max-width: 90px; background: linear-gradient(90deg, rgba(207,159,63,0.55) 0%, rgba(207,159,63,0) 100%);"></span>
          </div>

          <!-- Closing banner: same deep-red color, cross-pattern background, and copy as the bottom of Home.jsx -->
          <div style="
            background-color: #7a1010;
            background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Crect x='36' y='14' width='8' height='52'/%3E%3Crect x='18' y='30' width='44' height='8'/%3E%3C/g%3E%3C/svg%3E&quot;);
            background-repeat: repeat;
            padding: 40px 30px;
            text-align: center;
          ">
            <p class="come-as-you-are" style="
              font-family: Georgia, 'Cormorant Garamond', serif;
              font-size: 26px;
              font-weight: 700;
              color: #ffffff;
              margin: 0;
              line-height: 1.3;
            ">
              Come as you are<br/>There's a place for you here.
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

    // 8. Send via Brevo API
    await sendEmail(
      email,
      "Verify your account - Rooted in grace, reaching toward the light",
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

    // Re-run the same validation used at register time — protects
    // against someone bypassing /register and calling /verify directly
    // with a weak password or malformed email.
    const validationError = validateRegistrationInput({ name, email, password });
    if (validationError) {
      return res.status(400).json({ msg: validationError });
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

/* ===========================
    LOGOUT
=========================== */
// Stateless JWT setup — there's no server-side session to destroy here, so
// this endpoint doesn't invalidate anything by itself. It exists so the
// frontend has a real authenticated request to fire on logout (rather than
// silently deleting localStorage with no server round-trip), and so you have
// a single place to plug in a token blacklist/denylist later if you ever
// need to force-expire a token before its 7d lifetime is up.
exports.logout = async (req, res) => {
  try {
    // req.user is populated by authMiddleware — reaching this line means
    // the request came in with a currently-valid token.
    res.json({ msg: "Logged out successfully." });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ msg: "Server error during logout." });
  }
};