const bankAccountService = require("../services/bankAccountService");
const sendError = require("../utils/sendError");
const { parsePagination } = require("../utils/pagination");

// GET /bank-accounts?page=&limit=
// @route   GET /api/bank-accounts
exports.getBankAccounts = async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const { accounts, total } = await bankAccountService.getBankAccounts({
      skip: (page - 1) * limit,
      take: limit,
    });
    res.json({
      accounts,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    });
  } catch (err) {
    sendError(res, err);
  }
};

// GET /bank-accounts/:id
// @route   GET /api/bank-accounts/:id
exports.getBankAccountById = async (req, res) => {
  try {
    const account = await bankAccountService.getBankAccountById(req.params.id);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  } catch (err) {
    sendError(res, err);
  }
};

// POST /bank-accounts
// @route   POST /api/bank-accounts
exports.createBankAccount = async (req, res) => {
  try {
    const account = await bankAccountService.createBankAccount(req.body);
    res.status(201).json(account);
  } catch (err) {
    console.error(err);
    sendError(res, err);
  }
};

// PUT /bank-accounts/:id
// @route   PUT /api/bank-accounts/:id
exports.updateBankAccount = async (req, res) => {
  try {
    const account = await bankAccountService.updateBankAccount(req.params.id, req.body);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  } catch (err) {
    console.error(err);
    sendError(res, err);
  }
};

// DELETE /bank-accounts/:id
// @route   DELETE /api/bank-accounts/:id
exports.deleteBankAccount = async (req, res) => {
  try {
    const account = await bankAccountService.deleteBankAccount(req.params.id);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ message: "Account deleted" });
  } catch (err) {
    sendError(res, err);
  }
};
