const UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

exports.DURATION_PATTERN = /^\d+[smhdw]$/;

exports.parseDuration = (value, fallbackMs) => {
  const match = /^(\d+)([smhdw])$/.exec(String(value || "").trim());
  return match ? Number(match[1]) * UNITS[match[2]] : fallbackMs;
};
