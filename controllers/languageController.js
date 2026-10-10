const languageService = require("../services/languageService");
const { clearLanguageCache } = require("../middleware/resolveLanguage");
const sendError = require("../utils/sendError");

// GET ALL LANGUAGES
exports.getLanguages = async (req, res) => {
  try {
    const languages = await languageService.getLanguages();
    res.json(languages);
  } catch (err) {
    sendError(res, err);
  }
};

// GET SINGLE LANGUAGE
exports.getLanguageById = async (req, res) => {
  try {
    const language = await languageService.getLanguageById(req.params.id);
    if (!language) {
      return res.status(404).json({ message: "Language not found" });
    }
    res.json(language);
  } catch (err) {
    sendError(res, err);
  }
};

// CREATE LANGUAGE
exports.createLanguage = async (req, res) => {
  try {
    const existingLanguage = await languageService.findByCode(req.body.code);
    if (existingLanguage) {
      return res.status(400).json({ message: "Language code already exists" });
    }
    const savedLanguage = await languageService.createLanguage({
      name: req.body.name,
      code: req.body.code,
    });
    clearLanguageCache();
    res.status(201).json(savedLanguage);
  } catch (err) {
    sendError(res, err);
  }
};

// UPDATE LANGUAGE
exports.updateLanguage = async (req, res) => {
  try {
    if (req.body.code) {
      const existingLanguage = await languageService.findByCodeExcludingId(
        req.body.code,
        req.params.id
      );
      if (existingLanguage) {
        return res.status(400).json({ message: "Language code already exists" });
      }
    }
    const language = await languageService.updateLanguage(req.params.id, req.body);
    if (!language) {
      return res.status(404).json({ message: "Language not found" });
    }
    clearLanguageCache();
    res.json(language);
  } catch (err) {
    sendError(res, err);
  }
};

// DELETE LANGUAGE
exports.deleteLanguage = async (req, res) => {
  try {
    const language = await languageService.deleteLanguage(req.params.id);
    if (!language) {
      return res.status(404).json({ message: "Language not found" });
    }
    clearLanguageCache();
    res.json({ message: "Language deleted successfully" });
  } catch (err) {
    sendError(res, err);
  }
};
