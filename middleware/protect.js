const auth = require("./authMiddleware");
const audit = require("./audit");
const { requirePermission } = require("./permissions");

module.exports = (permission, entity, options = {}) => {
  const chain = [auth];
  if (options.audit !== false) chain.push(audit(entity, options));
  chain.push(requirePermission(permission));
  return chain;
};
