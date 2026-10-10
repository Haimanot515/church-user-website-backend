const bcrypt = require("bcryptjs");
const prisma = require("../prisma/prisma.service");
const { bcryptRounds } = require("../config/security");
const { reauthLimiter } = require("./rateLimiters");
const auditService = require("../services/auditService");

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", bcryptRounds);

const verifyCredential = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ msg: "Authentication required.", code: "authentication_required" });
    }

    const header = req.headers["x-reauth-credential"];
    const credential = Array.isArray(header) ? header[0] : header;

    if (typeof credential !== "string" || !credential || credential.length > 128) {
      return res
        .status(401)
        .json({ msg: "Re-enter your password to continue.", code: "reauthentication_required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    });

    const matches = await bcrypt.compare(credential, user ? user.password : DUMMY_HASH);

    if (!user || !matches) {
      res.locals.reauthFailed = true;
      res.locals.auditHandled = true;
      auditService.event(req, "auth.reauth_failed", {
        outcome: "denied",
        severity: "warning",
        metadata: { path: req.originalUrl.split("?")[0] },
      });
      return res.status(401).json({ msg: "Incorrect password.", code: "invalid_credential" });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

const chain = (handlers) => (req, res, next) => {
  let index = 0;
  const step = (err) => {
    if (err || index >= handlers.length) return next(err);
    return handlers[index++](req, res, step);
  };
  step();
};

const requireReauth = chain([reauthLimiter, verifyCredential]);

module.exports = { requireReauth };
