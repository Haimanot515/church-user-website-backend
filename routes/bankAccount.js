const router = require("express").Router();
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const {
  getBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} = require("../controllers/bankAccountController");

// GET: Publicly accessible — list all accounts (paginated)
router.get("/", getBankAccounts);
// GET: Publicly accessible — single account by id
router.get("/:id", getBankAccountById);
// POST: Restricted to admin
router.post("/", ...protect(P.BANK_ACCOUNT_MANAGE, "BankAccount"), createBankAccount);
// PUT: Restricted to admin
router.put("/:id", ...protect(P.BANK_ACCOUNT_MANAGE, "BankAccount"), updateBankAccount);
// DELETE: Restricted to admin
router.delete("/:id", ...protect(P.BANK_ACCOUNT_MANAGE, "BankAccount"), deleteBankAccount);

module.exports = router;
