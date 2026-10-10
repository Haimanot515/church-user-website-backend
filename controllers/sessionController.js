const sessionService = require("../services/sessionService");
const authService = require("../services/authService");
const auditService = require("../services/auditService");
const { signToken } = require("./authController");
const { toPublicUser } = require("../utils/access");
const deviceFrom = require("../utils/device");

const SESSION_ENDED = {
  msg: "Your session has ended. Please sign in again.",
  code: "session_ended",
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (typeof refreshToken !== "string" || !refreshToken) {
      return res.status(400).json({ msg: "refreshToken is required." });
    }

    const result = await sessionService.rotate(refreshToken, deviceFrom(req));

    if (!result.ok) {
      if (result.reason === "reuse") {
        auditService.event(req, "auth.refresh_reuse_detected", {
          outcome: "denied",
          severity: "critical",
          entity: "Session",
          entityId: result.sessionId,
          targetUserId: result.userId,
          metadata: { sessionsRevoked: result.revoked },
        });
      }
      if (result.reason === "conflict") {
        return res
          .status(409)
          .json({
            msg: "This session was just refreshed. Use the latest tokens.",
            code: "refresh_conflict",
          });
      }
      return res.status(401).json(SESSION_ENDED);
    }

    const user = await authService.findUserById(result.userId);
    if (!user || !user.isVerified) {
      await sessionService.revokeAllForUser(result.userId);
      return res.status(401).json(SESSION_ENDED);
    }

    res.json({
      token: signToken(user, result.sessionId),
      refreshToken: result.refreshToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("Refresh Error:", err);
    res.status(500).json({ msg: "Server error during refresh." });
  }
};

exports.me = async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
};

exports.listSessions = async (req, res) => {
  try {
    const sessions = await sessionService.listForUser(req.user.id);
    res.json({
      sessions: sessions.map((s) => ({ ...s, current: s.id === req.user.sessionId })),
    });
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const removed = await sessionService.revoke(req.user.id, req.params.id);
    if (!removed) return res.status(404).json({ msg: "Session not found." });
    auditService.event(req, "auth.session_revoked", { entity: "Session", entityId: req.params.id });
    res.json({ msg: "Session ended.", current: req.params.id === req.user.sessionId });
  } catch (err) {
    console.error("Revoke session error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.logoutAll = async (req, res) => {
  try {
    const revoked = await sessionService.revokeAllForUser(req.user.id);
    await authService.bumpTokenVersion(req.user.id);
    auditService.event(req, "auth.logout_all", {
      entity: "User",
      entityId: req.user.id,
      metadata: { sessionsRevoked: revoked },
    });
    res.json({ msg: "Signed out everywhere.", sessionsRevoked: revoked });
  } catch (err) {
    console.error("Logout all error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
