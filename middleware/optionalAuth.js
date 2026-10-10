const { authenticate } = require("../services/authenticate");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();

  try {
    const result = await authenticate(header);
    if (result.user) req.user = result.user;
  } catch (err) {
    req.user = undefined;
  }
  next();
};
