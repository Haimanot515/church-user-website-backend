const Language = require("../models/Language");


// GET ALL LANGUAGES
exports.getLanguages = async (req, res) => {

  try {

    const languages = await Language.find()
      .sort({ createdAt: -1, _id: -1 });

    res.json(languages);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// GET SINGLE LANGUAGE
exports.getLanguageById = async (req, res) => {

  try {

    const language = await Language.findById(req.params.id);

    if (!language) {

      return res.status(404).json({
        message: "Language not found"
      });

    }

    res.json(language);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// CREATE LANGUAGE
exports.createLanguage = async (req, res) => {

  try {

    const existingLanguage = await Language.findOne({
      code: req.body.code.toUpperCase()
    });

    if (existingLanguage) {

      return res.status(400).json({
        message: "Language code already exists"
      });

    }

    const language = new Language({

      name: req.body.name,

      code: req.body.code.toUpperCase()

    });

    const savedLanguage = await language.save();

    res.status(201).json(savedLanguage);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// UPDATE LANGUAGE
exports.updateLanguage = async (req, res) => {

  try {

    if (req.body.code) {

      const existingLanguage = await Language.findOne({

        code: req.body.code.toUpperCase(),

        _id: { $ne: req.params.id }

      });

      if (existingLanguage) {

        return res.status(400).json({
          message: "Language code already exists"
        });

      }

      req.body.code = req.body.code.toUpperCase();

    }

    const language = await Language.findByIdAndUpdate(

      req.params.id,

      {

        ...req.body,

        updatedAt: Date.now()

      },

      {

        new: true

      }

    );

    if (!language) {

      return res.status(404).json({
        message: "Language not found"
      });

    }

    res.json(language);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// DELETE LANGUAGE
exports.deleteLanguage = async (req, res) => {

  try {

    const language = await Language.findByIdAndDelete(req.params.id);

    if (!language) {

      return res.status(404).json({
        message: "Language not found"
      });

    }

    res.json({
      message: "Language deleted successfully"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};