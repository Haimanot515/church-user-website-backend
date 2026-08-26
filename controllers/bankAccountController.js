const BankAccount = require("../models/BankAccount");

// GET /bank-accounts?page=&limit=
// Publicly accessible — returns accounts sorted by display order
// @route   GET /api/bank-accounts
exports.getBankAccounts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const total = await BankAccount.countDocuments();

    const accounts = await BankAccount.find()
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      accounts,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /bank-accounts/:id
// Publicly accessible — a single account
// @route   GET /api/bank-accounts/:id
exports.getBankAccountById = async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /bank-accounts
// Admin only
// @route   POST /api/bank-accounts
exports.createBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.create(req.body);
    res.status(201).json(account);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// PUT /bank-accounts/:id
// Admin only
// @route   PUT /api/bank-accounts/:id
exports.updateBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// DELETE /bank-accounts/:id
// Admin only
// @route   DELETE /api/bank-accounts/:id
exports.deleteBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};