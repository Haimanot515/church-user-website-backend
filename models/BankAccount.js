const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    bank: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankAccount", bankAccountSchema);