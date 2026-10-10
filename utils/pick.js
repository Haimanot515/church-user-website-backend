// Copy only whitelisted keys that are present on the source object.
// Used to stop mass-assignment from req.body into Prisma updates.
module.exports = function pick(source, fields) {
  const out = {};
  if (!source || typeof source !== "object") return out;
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(source, f) && source[f] !== undefined) {
      out[f] = source[f];
    }
  }
  return out;
};
