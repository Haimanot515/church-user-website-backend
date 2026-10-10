const authService = require("../services/authService");
const homeHeroService = require("../services/homeHeroService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../config/mailer");
const { escapeHtml } = require("../utils/escapeHtml");
const { checkPassword, passwordMessage } = require("../utils/passwordPolicy");
const sessionService = require("../services/sessionService");
const auditService = require("../services/auditService");
const { toPublicUser } = require("../utils/access");
const deviceFrom = require("../utils/device");

const {
  bcryptRounds,
  otpExpiresMs,
  otpExpiresMinutes,
  otpMaxAttempts,
  passwordMinLength,
  accessTokenTtl,
} = require("../config/security");

const MAX_CODE_ATTEMPTS = otpMaxAttempts;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", bcryptRounds);

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const signToken = (user, sessionId) =>
  jwt.sign({ id: user.id, sid: sessionId, tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: accessTokenTtl,
  });

const issueSession = async (req, user) => {
  const { session, refreshToken } = await sessionService.create(user.id, deviceFrom(req));
  return {
    token: signToken(user, session.id),
    refreshToken,
    user: toPublicUser(user),
    sessionId: session.id,
  };
};

const actorOf = (user, sessionId) => ({
  actorId: user.id,
  actorEmail: user.email,
  actorRole: user.accessRole ? user.accessRole.name : "user",
  sessionId,
});

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRegistrationInput = ({ name, email, password }) => {
  if (!name || !email || !password) {
    return "All fields are required.";
  }
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    return "Invalid input.";
  }
  if (name.trim().length > 100 || email.length > 254 || password.length > 128) {
    return "Input is too long.";
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return "Name must be at least 2 characters.";
  }
  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  const reason = checkPassword(password, { minLength: passwordMinLength, personal: [name, email] });
  if (reason) return passwordMessage(reason, passwordMinLength);
  return null;
};

exports.register = async (req, res) => {
  try {
    const { name: rawName, email: rawEmail, password } = req.body || {};
    const validationError = validateRegistrationInput({ name: rawName, email: rawEmail, password });
    if (validationError) {
      return res.status(400).json({ msg: validationError });
    }

    const name = rawName.trim();
    const email = normalizeEmail(rawEmail);

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ msg: "User already exists." });
    }

    const heroData = await homeHeroService.getLatestHomeHeroAnyLanguage();
    const displayLogo =
      heroData && heroData.image
        ? heroData.image
        : "https://res.cloudinary.com/dq3jkpys8/image/upload/v1770377714/home_hero/i6vhbionblsgudwkywqb.jpg";

    await authService.deleteUnusedVerificationCodes(email);

    const code = crypto.randomInt(100000, 1000000).toString();

    await authService.createVerificationCode({
      email,
      code,
      expiresAt: new Date(Date.now() + otpExpiresMs),
    });

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
          <div style="padding: 50px 30px 36px 30px; text-align: center; background: linear-gradient(180deg, #1c3a52 0%, #0f2438 100%);">
            <img src="${escapeHtml(displayLogo)}" style="width: 64px; height: 64px; border-radius: 10px; object-fit: cover; margin-bottom: 20px; border: 2px solid #cf9f3f;" />
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
          <div style="padding: 40px 40px 8px 40px; text-align: center;">
            <span style="
              font-family: 'IBM Plex Mono', monospace;
              font-size: 11px;
              font-weight: 500;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #cf9f3f;
            ">Account Verification</span>
            <p style="font-size: 16px; color: #1c3a52; margin: 18px 0 4px 0;">Hello <strong>${escapeHtml(name)}</strong>,</p>
            <p style="font-size: 15px; color: #3d5a6c; line-height: 1.6;">
              Use the verification code below to confirm your account.
            </p>
            <div style="margin: 26px 0; padding: 20px; background-color: #f3f8fa; border: 1px solid #d5eaf3; border-radius: 8px; display: inline-block;">
              <span class="otp" style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0f2438; font-family: 'IBM Plex Mono', monospace;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #94a9b6; margin: 0 0 8px 0;">
              This code expires in ${otpExpiresMinutes} minutes.
            </p>
          </div>
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
          <div style="display: flex; align-items: center; justify-content: center; gap: 22px; padding: 0 30px 40px 30px;">
            <span style="flex: 1; height: 2px; max-width: 90px; background: linear-gradient(90deg, rgba(207,159,63,0) 0%, rgba(207,159,63,0.55) 100%);"></span>
            <svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="11" y="0" width="4" height="38" fill="#cf9f3f" />
              <rect x="2" y="9" width="22" height="4" fill="#cf9f3f" />
            </svg>
            <span style="flex: 1; height: 2px; max-width: 90px; background: linear-gradient(90deg, rgba(207,159,63,0.55) 0%, rgba(207,159,63,0) 100%);"></span>
          </div>
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

exports.verify = async (req, res) => {
  try {
    const { code, email: rawEmail, name: rawName, password } = req.body || {};
    if (!code || !rawEmail || !rawName || !password) {
      return res.status(400).json({ msg: "All fields are required." });
    }
    if (typeof code !== "string" && typeof code !== "number") {
      return res.status(400).json({ msg: "Invalid input." });
    }

    const validationError = validateRegistrationInput({ name: rawName, email: rawEmail, password });
    if (validationError) {
      return res.status(400).json({ msg: validationError });
    }

    const name = rawName.trim();
    const email = normalizeEmail(rawEmail);

    const record = await authService.findLatestActiveVerificationCode(email);
    if (!record) {
      return res.status(400).json({ msg: "Invalid or already used code." });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ msg: "Verification code expired." });
    }
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await authService.consumeVerificationCode(record.id);
      return res
        .status(429)
        .json({ msg: "Too many incorrect attempts. Please request a new code." });
    }

    if (!safeEqual(String(code).trim(), record.dbCode)) {
      await authService.incrementVerificationAttempts(record.id);
      return res.status(400).json({ msg: "Invalid or already used code." });
    }

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ msg: "User already registered." });
    }

    const consumed = await authService.consumeVerificationCode(record.id);
    if (!consumed) {
      return res.status(400).json({ msg: "Invalid or already used code." });
    }

    const hashedPassword = await bcrypt.hash(password, bcryptRounds);
    let user;
    try {
      user = await authService.createUser({ name, email, hashedPassword });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ msg: "User already registered." });
      }
      throw err;
    }

    const { token, refreshToken, user: publicUser, sessionId } = await issueSession(req, user);
    auditService.event(req, "auth.register_completed", {
      ...actorOf(user, sessionId),
      entity: "User",
      entityId: user.id,
    });

    res.json({ msg: "Registration successful!", token, refreshToken, user: publicUser });
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ msg: "Server error during verification." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password required." });
    }
    if (typeof email !== "string" || typeof password !== "string" || password.length > 128) {
      return res.status(400).json({ msg: "Invalid input." });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await authService.findUserByEmail(normalizedEmail);

    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((user.lockedUntil - Date.now()) / 60000));
      auditService.event(req, "auth.login_failed", {
        outcome: "denied",
        severity: "warning",
        targetUserId: user.id,
        metadata: { reason: "account_locked", email: normalizedEmail },
      });
      return res.status(429).json({
        msg: `Too many failed login attempts. Try again in ${minutes} minute(s).`,
      });
    }

    if (!user || !user.isVerified || !isMatch) {
      auditService.event(req, "auth.login_failed", {
        outcome: "failure",
        severity: "warning",
        targetUserId: user ? user.id : undefined,
        metadata: {
          reason: !user ? "unknown_email" : !user.isVerified ? "unverified" : "wrong_password",
          email: normalizedEmail,
        },
      });
      if (user) {
        const nowLocked = await authService.recordFailedLogin(user.id);
        if (nowLocked) {
          auditService.event(req, "auth.account_locked", {
            severity: "warning",
            entity: "User",
            entityId: user.id,
            targetUserId: user.id,
          });
          return res.status(429).json({
            msg: "Too many failed login attempts. Your account is temporarily locked.",
          });
        }
      }
      return res.status(401).json({ msg: "Invalid email or password." });
    }

    if ((user.failedLoginAttempts ?? 0) > 0 || user.lockedUntil) {
      await authService.clearLoginFailures(user.id);
    }

    const { token, refreshToken, user: publicUser, sessionId } = await issueSession(req, user);
    auditService.event(req, "auth.login_success", {
      ...actorOf(user, sessionId),
      entity: "User",
      entityId: user.id,
    });

    res.json({ token, refreshToken, user: publicUser });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ msg: "Server error during login." });
  }
};

exports.logout = async (req, res) => {
  try {
    await sessionService.revoke(req.user.id, req.user.sessionId);
    auditService.event(req, "auth.logout", { entity: "Session", entityId: req.user.sessionId });
    res.json({ msg: "Logged out successfully." });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ msg: "Server error during logout." });
  }
};

exports.signToken = signToken;
