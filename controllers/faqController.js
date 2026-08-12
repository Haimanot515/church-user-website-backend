const Faq = require("../models/FAQ");

// @desc    Get FAQ entries for the current language (Newest First)
//          Optionally filtered by category via ?category=Contact (or Faith / Information)
// @route   GET /api/faq
exports.getFaq = async (req, res) => {
  try {
    const filter = { language: req.language };
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const faq = await Faq.find(filter)
      .populate("language", "name code")
      .sort({ category: 1, order: 1, createdAt: -1, _id: -1 });
    res.json(faq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get the list of valid FAQ categories (from schema enum)
// @route   GET /api/faq/categories
exports.getFaqCategories = async (req, res) => {
  try {
    const categories = Faq.schema.path("category").enumValues;
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new FAQ entry
// @route   POST /api/faq
exports.createFaq = async (req, res) => {
  try {
    const newFaq = new Faq({
      question: req.body.question,
      answer: req.body.answer,
      category: req.body.category,
      order: req.body.order,
      language: req.body.language,
    });

    const savedFaq = await newFaq.save();
    res.status(201).json(savedFaq);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create FAQ entry", error: err.message });
  }
};

// @desc    Update a specific FAQ entry by ID
// @route   PUT /api/faq/:id
exports.updateFaq = async (req, res) => {
  try {
    const updateData = {};

    // Map body fields — only set fields that were actually provided
    const fields = ["question", "answer", "category", "order", "language"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "null") {
        updateData[field] = req.body[field];
      }
    });

    // This updates a specific entry using its ID (e.g., 6982ff326b288509e3790cfc)
    const faq = await Faq.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!faq) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json(faq);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a specific FAQ entry by ID
// @route   DELETE /api/faq/:id
exports.deleteFaq = async (req, res) => {
  try {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "FAQ entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};