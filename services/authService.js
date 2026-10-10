const prisma = require("../prisma/prisma.service");
const { maxLoginAttempts, lockoutMs } = require("../config/security");
const { ROLE_NAMES } = require("../config/permissions");
const { USER_ACCESS_SELECT } = require("./accessService");

const ACCESS_ROLE = { select: USER_ACCESS_SELECT.accessRole.select };

// Emails are matched case-insensitively so "A@x.com" and "a@x.com" are the same account.
exports.findUserByEmail = async (email) => {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { accessRole: ACCESS_ROLE },
  });
};

exports.findUserById = async (id) => {
  return prisma.user.findUnique({ where: { id }, select: USER_ACCESS_SELECT });
};

exports.getLatestHomeHero = async () => {
  return prisma.homeHero.findFirst({ orderBy: { createdAt: "desc" } });
};

exports.deleteUnusedVerificationCodes = async (email) => {
  return prisma.verificationCode.deleteMany({ where: { email, used: false } });
};

exports.createVerificationCode = async ({ email, code, expiresAt }) => {
  return prisma.verificationCode.create({
    data: { email, dbCode: code, used: false, attempts: 0, expiresAt },
  });
};

// Newest unused code for this email (older ones are deleted on register anyway).
exports.findLatestActiveVerificationCode = async (email) => {
  return prisma.verificationCode.findFirst({
    where: { email, used: false },
    orderBy: { createdAt: "desc" },
  });
};

exports.incrementVerificationAttempts = async (id) => {
  return prisma.verificationCode.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
};

// Atomic: returns true only for the single request that actually consumed the code.
exports.consumeVerificationCode = async (id) => {
  const result = await prisma.verificationCode.updateMany({
    where: { id, used: false },
    data: { used: true },
  });
  return result.count === 1;
};

exports.createUser = async ({ name, email, hashedPassword }) => {
  return prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      isVerified: true,
      accessRole: { connect: { name: ROLE_NAMES.USER } },
    },
    include: { accessRole: ACCESS_ROLE },
  });
};

// Invalidates every token issued before now (used by logout).
exports.bumpTokenVersion = async (id) => {
  return prisma.user.update({
    where: { id },
    data: { tokenVersion: { increment: 1 } },
  });
};

// Counts a wrong password. Returns true when this attempt just locked the account.
exports.recordFailedLogin = async (id) => {
  const updated = await prisma.user.update({
    where: { id },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true },
  });
  if (updated.failedLoginAttempts >= maxLoginAttempts) {
    await prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + lockoutMs) },
    });
    return true;
  }
  return false;
};

exports.clearLoginFailures = async (id) => {
  return prisma.user.update({
    where: { id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
};
