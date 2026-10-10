const jwt = require("jsonwebtoken");
const sessions = require("./sessionService");
const { toRequestUser } = require("../utils/access");

const tokenFromHeader = (header) =>
  header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();

exports.authenticate = async (header) => {
  let decoded;
  try {
    decoded = jwt.verify(tokenFromHeader(header), process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (err) {
    return { error: err && err.name === "TokenExpiredError" ? "token_expired" : "invalid_token" };
  }

  if (typeof decoded.sid !== "string" || decoded.id === undefined)
    return { error: "invalid_token" };

  const session = await sessions.findForAuth(decoded.sid);
  const now = new Date();
  const ended =
    !session ||
    session.userId !== String(decoded.id) ||
    session.expiresAt <= now ||
    session.absoluteExpiresAt <= now;
  if (ended) return { error: "session_ended" };

  const { user } = session;
  if (!user || !user.isVerified || (decoded.tv ?? 0) !== user.tokenVersion)
    return { error: "session_ended" };

  sessions.touch(session);
  return { user: toRequestUser(user, session.id) };
};
