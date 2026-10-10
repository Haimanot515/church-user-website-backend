const BROWSERS = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Chrome\//, "Chrome"],
  [/Firefox\//, "Firefox"],
  [/Safari\//, "Safari"],
];

const SYSTEMS = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iOS/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

const firstMatch = (table, text) => {
  const hit = table.find(([pattern]) => pattern.test(text));
  return hit ? hit[1] : null;
};

module.exports = function deviceLabel(userAgent) {
  if (typeof userAgent !== "string" || !userAgent) return null;
  const browser = firstMatch(BROWSERS, userAgent);
  const system = firstMatch(SYSTEMS, userAgent);
  if (browser && system) return `${browser} on ${system}`;
  return browser || system;
};
