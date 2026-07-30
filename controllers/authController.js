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

   // 7. Prepare Professional HTML Email (Church-themed, Corrected Syntax)
    const churchName = "Your Church Name"; // TODO: replace with real name or pass in as a param

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media screen and (max-width: 480px) {
          .card { width: 100% !important; border-radius: 0 !important; }
          .brand-name { font-size: 30px !important; letter-spacing: -1px !important; }
          .otp { font-size: 26px !important; letter-spacing: 4px !important; }
          .hero-pad { padding: 32px 20px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #d5eaf3; font-family: 'Segoe UI', Arial, sans-serif;">
      <center style="width: 100%; background-color: #d5eaf3; padding: 40px 0;">
        <div class="card" style="max-width: 600px; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 40px rgba(15,36,56,0.18); background-color: #ffffff;">

          <!-- HERO / HEADER — navy gradient like the site's hero section -->
          <div class="hero-pad" style="padding: 48px 30px 40px 30px; text-align: center; background-color: #0f2438; background-image: linear-gradient(180deg, #1c3a52 0%, #0f2438 100%);">

            <!-- Cross accent (table-safe, no SVG) -->
            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto 22px auto;">
              <tr>
                <td align="center">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:22px; height:4px; background-color:#cf9f3f; font-size:0; line-height:0;">&nbsp;</td>
                    </tr>
                  </table>
                  <div style="width:4px; height:22px; background-color:#cf9f3f; margin: -13px auto 0 auto;"></div>
                </td>
              </tr>
            </table>

            <p style="margin: 0 0 10px 0; font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #cf9f3f;">
              Account Verification
            </p>

            <h1 class="brand-name" style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; font-weight: 700; letter-spacing: -0.5px; color: #eaf3f8;">
              ${churchName}
            </h1>
          </div>

          <!-- BODY -->
          <div style="padding: 42px 40px 30px 40px; text-align: center;">
            <p style="font-size: 16px; color: #1c3a52; margin: 0 0 6px 0;">Peace be with you, <strong>${name}</strong>,</p>
            <p style="font-size: 14.5px; color: #3d5a6c; line-height: 1.7; margin: 0 0 30px 0;">
              Please use the verification code below to confirm it's really you. This helps keep our church community's accounts safe.
            </p>

            <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="padding: 22px 34px; background-color: #f7faf9; border: 1.5px solid #cf9f3f; border-radius: 10px;">
                  <span class="otp" style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f2438; font-family: 'Courier New', monospace;">${code}</span>
                </td>
              </tr>
            </table>

            <p style="font-size: 12.5px; color: #9aa9b3; margin: 22px 0 0 0;">
              This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
            </p>
          </div>

          <!-- DIVIDER — small cross, like your section-cross-divider -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding: 6px 40px 26px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 60px; height: 1px; background-color: #e6dcc6;">&nbsp;</td>
                    <td style="width: 16px; height: 16px; text-align:center; font-size: 14px; color: #cf9f3f; padding: 0 8px;">&#10013;</td>
                    <td style="width: 60px; height: 1px; background-color: #e6dcc6;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- FOOTER -->
          <div style="background-color: #7a1010; padding: 26px; text-align: center;">
            <p style="font-size: 12px; color: rgba(255,255,255,0.85); margin: 0; font-family: Georgia, serif;">
              &copy; ${new Date().getFullYear()} ${churchName}. Rooted in grace, reaching toward the light.
            </p>
            <p style="font-size: 10.5px; color: rgba(255,255,255,0.55); margin: 6px 0 0 0; letter-spacing: 0.5px;">
              This is an automated message — please do not reply directly to this email.
            </p>
          </div>

        </div>
      </center>
    </body>
    </html>
    `;
    // 8. Send via Brevo API
    await sendEmail(
        email, 
        "Verification Code - Ethiopian Orthodox Tewahedo Church – Debre Selam Abune Gebre Menfes Kidus Church, Udine", 
        htmlContent
    );

    res.json({ msg: "Verification code sent to your email." });

  } catch (err) {
    console.error("❌ Registration/Brevo Error:", err);
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
    console.error("❌ Verification Error:", err);
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
    console.error("❌ Login Error:", err);
    res.status(500).json({ msg: "Server error during login." });
  }
};
