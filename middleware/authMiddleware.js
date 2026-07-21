const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ msg: "No token provided. Access denied." });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded payload to request
    req.user = decoded;

    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(403).json({ msg: "Invalid or expired token." });
  }
};
