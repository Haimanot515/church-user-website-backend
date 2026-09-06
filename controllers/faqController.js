const faqService = require("../services/faqService");

// @desc    Get FAQ entries for the current language (Newest First)
// @route   GET /api/faq
exports.getFaq = async (req, res) => {
  try {
    const faq = await faqService.getFaq(req.language, req.query.category);
    res.json(faq);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get the list of valid FAQ categories
// @route   GET /api/faq/categories
exports.getFaqCategories = async (req, res) => {
  try {
    const categories = faqService.getFaqCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new FAQ entry
// @route   POST /api/faq
exports.createFaq = async (req, res) => {
  try {
    const savedFaq = await faqService.createFaq({
      question: req.body.question,
      answer: req.body.answer,
      category: req.body.category,
      order: req.body.order,
      language: req.body.language,
    });
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
    const faq = await faqService.updateFaq(req.params.id, req.body);
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
    const faq = await faqService.deleteFaq(req.params.id);
    if (!faq) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "FAQ entry deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
