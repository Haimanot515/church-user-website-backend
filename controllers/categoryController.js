const Category = require("../models/Category");


// GET ALL CATEGORIES
exports.getCategories = async (req, res) => {

  try {

    const categories = await Category.find()
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




// CREATE CATEGORY
exports.createCategory = async (req, res) => {

  try {

    const existingCategory = await Category.findOne({
      name: req.body.name
    });

    if (existingCategory) {

      return res.status(400).json({
        message: "Category already exists"
      });

    }

    const category = new Category({

      name: req.body.name,

      description: req.body.description

    });

    const savedCategory = await category.save();

    res.status(201).json(savedCategory);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// UPDATE CATEGORY
exports.updateCategory = async (req, res) => {

  try {

    if (req.body.name) {

      const existingCategory = await Category.findOne({

        name: req.body.name,

        _id: { $ne: req.params.id }

      });

      if (existingCategory) {

        return res.status(400).json({
          message: "Category already exists"
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