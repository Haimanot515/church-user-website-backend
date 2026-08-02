const Category = require("../models/Category");


// GET ALL CATEGORIES (public — language-scoped via header)
exports.getCategories = async (req, res) => {

  try {

    const categories = await Category.find({ language: req.language })
      .sort({ createdAt: -1, _id: -1 });

    res.json(categories);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// GET SINGLE CATEGORY
exports.getCategoryById = async (req, res) => {

  try {

    const category = await Category.findById(req.params.id);

    if (!category) {

      return res.status(404).json({
        message: "Category not found"
      });

    }

    res.json(category);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// GET CATEGORY BY SLUG (public — language-scoped via header)
// e.g. GET /api/categories/slug/travel
// with Accept-Language: am -> returns the ጉዞ document
// with Accept-Language: it -> returns the Viaggi document
exports.getCategoryBySlug = async (req, res) => {

  try {

    const category = await Category.findOne({
      slug: req.params.slug.toLowerCase(),
      language: req.language
    });

    if (!category) {

      return res.status(404).json({
        message: "Category not found"
      });

    }

    res.json(category);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// CREATE CATEGORY (admin — language comes from request body)
exports.createCategory = async (req, res) => {

  try {

    if (!req.body.language) {

      return res.status(400).json({
        message: "Language is required"
      });

    }

    if (!req.body.slug) {

      return res.status(400).json({
        message: "Slug is required"
      });

    }

    const slug = req.body.slug.toLowerCase().trim();

    const existingCategory = await Category.findOne({
      name: req.body.name,
      language: req.body.language
    });

    if (existingCategory) {

      return res.status(400).json({
        message: "Category already exists for this language"
      });

    }

    const existingSlug = await Category.findOne({
      slug,
      language: req.body.language
    });

    if (existingSlug) {

      return res.status(400).json({
        message: "Slug already exists for this language"
      });

    }

    const category = new Category({

      name: req.body.name,

      slug,

      description: req.body.description,

      language: req.body.language

    });

    const savedCategory = await category.save();

    res.status(201).json(savedCategory);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// UPDATE CATEGORY (admin)
exports.updateCategory = async (req, res) => {

  try {

    if (req.body.name || req.body.language) {

      const current = await Category.findById(req.params.id);

      if (!current) {

        return res.status(404).json({
          message: "Category not found"
        });

      }

      const checkName = req.body.name || current.name;
      const checkLanguage = req.body.language || current.language;

      const existingCategory = await Category.findOne({

        name: checkName,

        language: checkLanguage,

        _id: { $ne: req.params.id }

      });

      if (existingCategory) {

        return res.status(400).json({
          message: "Category already exists for this language"
        });

      }

    }

    if (req.body.slug) {

      req.body.slug = req.body.slug.toLowerCase().trim();

      const current = await Category.findById(req.params.id);

      if (!current) {

        return res.status(404).json({
          message: "Category not found"
        });

      }

      const checkLanguage = req.body.language || current.language;

      const existingSlug = await Category.findOne({

        slug: req.body.slug,

        language: checkLanguage,

        _id: { $ne: req.params.id }

      });

      if (existingSlug) {

        return res.status(400).json({
          message: "Slug already exists for this language"
        });

      }

    }

    const category = await Category.findByIdAndUpdate(

      req.params.id,

      {

        ...req.body,

        updatedAt: Date.now()

      },

      {

        new: true

      }

    );

    if (!category) {

      return res.status(404).json({
        message: "Category not found"
      });

    }

    res.json(category);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// DELETE CATEGORY
exports.deleteCategory = async (req, res) => {

  try {

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {

      return res.status(404).json({
        message: "Category not found"
      });

    }

    res.json({
      message: "Category deleted successfully"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};