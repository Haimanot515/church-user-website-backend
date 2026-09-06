const categoryService = require("../services/categoryService");

// GET ALL CATEGORIES (public — language-scoped via header)
exports.getCategories = async (req, res) => {
  try {
    const categories = await categoryService.getCategories(req.language);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE CATEGORY
exports.getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET CATEGORY BY SLUG (public — language-scoped via header)
exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug, req.language);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE CATEGORY (admin — language comes from request body)
exports.createCategory = async (req, res) => {
  try {
    if (!req.body.language) {
      return res.status(400).json({ message: "Language is required" });
    }
    if (!req.body.slug) {
      return res.status(400).json({ message: "Slug is required" });
    }

    const slug = req.body.slug.toLowerCase().trim();

    const existingCategory = await categoryService.findByNameAndLanguage(req.body.name, req.body.language);
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists for this language" });
    }

    const existingSlug = await categoryService.findBySlugAndLanguage(slug, req.body.language);
    if (existingSlug) {
      return res.status(400).json({ message: "Slug already exists for this language" });
    }

    const savedCategory = await categoryService.createCategory({
      name: req.body.name,
      slug,
      description: req.body.description,
      language: req.body.language,
    });
    res.status(201).json(savedCategory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE CATEGORY (admin)
exports.updateCategory = async (req, res) => {
  try {
    if (req.body.name || req.body.language) {
      const current = await categoryService.getCategoryById(req.params.id);
      if (!current) {
        return res.status(404).json({ message: "Category not found" });
      }
      const checkName = req.body.name || current.name;
      const checkLanguage = req.body.language || current.languageId;
      const existingCategory = await categoryService.findConflictingName(checkName, checkLanguage, req.params.id);
      if (existingCategory) {
        return res.status(400).json({ message: "Category already exists for this language" });
      }
    }

    if (req.body.slug) {
      req.body.slug = req.body.slug.toLowerCase().trim();
      const current = await categoryService.getCategoryById(req.params.id);
      if (!current) {
        return res.status(404).json({ message: "Category not found" });
      }
      const checkLanguage = req.body.language || current.languageId;
      const existingSlug = await categoryService.findConflictingSlug(req.body.slug, checkLanguage, req.params.id);
      if (existingSlug) {
        return res.status(400).json({ message: "Slug already exists for this language" });
      }
    }

    const category = await categoryService.updateCategory(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE CATEGORY
exports.deleteCategory = async (req, res) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
