const languageService = require("../services/languageService");

const DEFAULT_LANGUAGE_CODE = "EN";
const TTL_MS = 5 * 60 * 1000;

// code -> { id, expires }. Languages change rarely, so avoid a DB hit per request.
const cache = new Map();

const lookup = async (code) => {
  const hit = cache.get(code);
  if (hit && hit.expires > Date.now()) return hit.id;

  const doc = await languageService.findByCode(code);
  const id = doc ? doc.id : null;
  // Only cache hits, so a language created later is picked up immediately.
  if (id) cache.set(code, { id, expires: Date.now() + TTL_MS });
  return id;
};

const clearLanguageCache = () => cache.clear();

// "am-ET,en;q=0.9" -> "AM"
const parseCode = (header) => {
  if (!header || typeof header !== "string") return DEFAULT_LANGUAGE_CODE;
  const first = header.split(",")[0].split(";")[0].trim();
  const primary = first.split("-")[0].trim().toUpperCase();
  return /^[A-Z]{2,8}$/.test(primary) ? primary : DEFAULT_LANGUAGE_CODE;
};

const resolveLanguage = async (req, res, next) => {
  try {
    const code = parseCode(req.headers["accept-language"]);
    let id = await lookup(code);
    if (!id && code !== DEFAULT_LANGUAGE_CODE) id = await lookup(DEFAULT_LANGUAGE_CODE);
    req.language = id;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = resolveLanguage;
module.exports.clearLanguageCache = clearLanguageCache;
module.exports.parseCode = parseCode;
