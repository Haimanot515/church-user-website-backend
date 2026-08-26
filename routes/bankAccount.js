const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
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
router.post("/", auth, adminAuth, createBankAccount);
// PUT: Restricted to admin
router.put("/:id", auth, adminAuth, updateBankAccount);
// DELETE: Restricted to admin
router.delete("/:id", auth, adminAuth, deleteBankAccount);

module.exports = router;