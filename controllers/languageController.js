const languageService = require("../services/languageService");

// GET ALL LANGUAGES
exports.getLanguages = async (req, res) => {
  try {
    const languages = await languageService.getLanguages();
    res.json(languages);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
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
    res.status(201).json(savedLanguage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE LANGUAGE
exports.updateLanguage = async (req, res) => {
  try {
    if (req.body.code) {
      const existingLanguage = await languageService.findByCodeExcludingId(req.body.code, req.params.id);
      if (existingLanguage) {
        return res.status(400).json({ message: "Language code already exists" });
      }
    }
    const language = await languageService.updateLanguage(req.params.id, req.body);
    if (!language) {
      return res.status(404).json({ message: "Language not found" });
    }
    res.json(language);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE LANGUAGE
exports.deleteLanguage = async (req, res) => {
  try {
    const language = await languageService.deleteLanguage(req.params.id);
    if (!language) {
      return res.status(404).json({ message: "Language not found" });
    }
    res.json({ message: "Language deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
