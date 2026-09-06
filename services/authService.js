const prisma = require("../prisma/prisma.service");

// Mirrors: User.findOne({ email })
exports.findUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

// Mirrors: HomeHero.findOne().sort({ createdAt: -1 })
exports.getLatestHomeHero = async () => {
  return prisma.homeHero.findFirst({
    orderBy: { createdAt: "desc" },
  });
};

// Mirrors: VerificationCode.deleteMany({ email, used: false })
exports.deleteUnusedVerificationCodes = async (email) => {
  return prisma.verificationCode.deleteMany({
    where: { email, used: false },
  });
};

// Mirrors: VerificationCode.create({ email, DBcode, used:false, expiresAt })
exports.createVerificationCode = async ({ email, code, expiresAt }) => {
  return prisma.verificationCode.create({
    data: {
      email,
      dbCode: code, // maps to DB column "DBcode" via @map in schema
      used: false,
      expiresAt,
    },
  });
};

// Mirrors: VerificationCode.findOne({ email, DBcode: code, used: false })
exports.findValidVerificationCode = async ({ email, code }) => {
  return prisma.verificationCode.findFirst({
    where: { email, dbCode: code, used: false },
  });
};

// Mirrors: record.used = true; await record.save();
exports.markVerificationCodeUsed = async (id) => {
  return prisma.verificationCode.update({
    where: { id },
    data: { used: true },
  });
};

// Mirrors: User.create({ name, email, password: hashedPassword, isVerified: true })
exports.createUser = async ({ name, email, hashedPassword }) => {
  return prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      isVerified: true,
    },
  });
};