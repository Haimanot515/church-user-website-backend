const prisma = require("../prisma/prisma.service");

// Mirrors: BankAccount.find().sort({order:1}).skip().limit() + countDocuments()
exports.getBankAccounts = async ({ skip, take }) => {
  const [accounts, total] = await Promise.all([
    prisma.bankAccount.findMany({
      orderBy: { order: "asc" },
      skip,
      take,
    }),
    prisma.bankAccount.count(),
  ]);
  return { accounts, total };
};

// Mirrors: BankAccount.findById(id)
exports.getBankAccountById = async (id) => {
  return prisma.bankAccount.findUnique({ where: { id } });
};

// Mirrors: BankAccount.create(req.body)
// NOTE: original passes req.body straight through — Mongoose silently
// drops unknown fields (schema not strict:false, default strict mode
// strips them). Prisma throws on unknown "data" keys instead, so fields
// are explicitly whitelisted here to keep the same effective behavior
// (extra junk fields in the body are ignored, not rejected).
exports.createBankAccount = async ({ bank, accountName, accountNumber, order }) => {
  return prisma.bankAccount.create({
    data: {
      bank,
      accountName,
      accountNumber,
      ...(order !== undefined && { order: Number(order) }),
    },
  });
};

// Mirrors: BankAccount.findByIdAndUpdate(id, req.body, { new:true, runValidators:true })
exports.updateBankAccount = async (id, body) => {
  const updateData = {};
  if (body.bank !== undefined) updateData.bank = body.bank;
  if (body.accountName !== undefined) updateData.accountName = body.accountName;
  if (body.accountNumber !== undefined) updateData.accountNumber = body.accountNumber;
  if (body.order !== undefined) updateData.order = Number(body.order);
  try {
    return await prisma.bankAccount.update({ where: { id }, data: updateData });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: BankAccount.findByIdAndDelete(id)
exports.deleteBankAccount = async (id) => {
  try {
    return await prisma.bankAccount.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};