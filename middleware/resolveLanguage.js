const Language = require("../models/Language");

const DEFAULT_LANGUAGE_CODE = "EN"; // matches the uppercase storage format

const resolveLanguage = async (req, res, next) => {

  try {

    const headerValue = req.headers["accept-language"];

    // Accept-Language can come as "am" or "am,en;q=0.9" — take the first code,
    // uppercase it to match how codes are stored (see Language controller)
    const code = headerValue
      ? headerValue.split(",")[0].trim().toUpperCase()
      : DEFAULT_LANGUAGE_CODE;

    let languageDoc = await Language.findOne({ code });

    if (!languageDoc) {

      // fallback to default language if the requested one doesn't exist
      languageDoc = await Language.findOne({ code: DEFAULT_LANGUAGE_CODE });

    }

    req.language = languageDoc ? languageDoc._id : null;

    next();

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};

module.exports = resolveLanguage;