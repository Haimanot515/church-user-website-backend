const { authenticate } = require("../services/authenticate");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ msg: "No token provided. Access denied." });
  }

  try {
    const result = await authenticate(header);
    if (result.error) {
      return res.status(403).json({ msg: "Invalid or expired token.", code: result.error });
    }
    req.user = result.user;
    next();
  } catch (err) {
    next(err);
  }
};
