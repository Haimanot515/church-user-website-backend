const prisma = require("../prisma/prisma.service");

// Mirrors: ChurchAssignment.updateMany({ user, isCurrent: true }, { isCurrent: false })
// (used in both createAssignment and updateAssignment, scoped per-user)
exports.unsetCurrentForUser = async (userId, excludeId = null) => {
  return prisma.churchAssignment.updateMany({
    where: {
      userId,
      isCurrent: true,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    data: { isCurrent: false },
  });
};

// Mirrors: ChurchAssignment.updateMany({ isPrimary: true }, { isPrimary: false })
// (global scope — NOT per-user, matches controller comment exactly)
exports.unsetPrimaryGlobally = async (excludeId = null) => {
  return prisma.churchAssignment.updateMany({
    where: {
      isPrimary: true,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    data: { isPrimary: false },
  });
};

// Mirrors: ChurchAssignment.create({...})
exports.createAssignment = async ({
  user,
  church,
  role,
  servingSince,
  description,
  image,
  isCurrent,
  isPrimary,
}) => {
  return prisma.churchAssignment.create({
    data: {
      userId: user,
      churchId: church,
      ...(role !== undefined && { role }),
      ...(servingSince !== undefined && { servingSince: servingSince ? new Date(servingSince) : null }),
      ...(description !== undefined && { description }),
      image,
      isCurrent,
      isPrimary,
    },
  });
};

// Mirrors: ChurchAssignment.findByIdAndUpdate(id, updates, {new:true}).populate("church").populate("user")
exports.updateAssignment = async (id, updates) => {
  const data = {};
  const passthroughFields = ["role", "description"];
  passthroughFields.forEach((f) => {
    if (updates[f] !== undefined) data[f] = updates[f];
  });
  if (updates.servingSince !== undefined) {
    data.servingSince = updates.servingSince ? new Date(updates.servingSince) : null;
  }
  if (updates.user !== undefined) data.userId = updates.user;
  if (updates.church !== undefined) data.churchId = updates.church;
  if (updates.isCurrent !== undefined) data.isCurrent = updates.isCurrent;
  if (updates.isPrimary !== undefined) data.isPrimary = updates.isPrimary;
  if (updates.image !== undefined) data.image = updates.image;

  try {
    return await prisma.churchAssignment.update({
      where: { id },
      data,
      include: { church: true, user: true },
    });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};

// Mirrors: ChurchAssignment.findOne({ user: userId, isCurrent: true }).populate("church").populate("user")
exports.getCurrentChurchForUser = async (userId) => {
  return prisma.churchAssignment.findFirst({
    where: { userId, isCurrent: true },
    include: { church: true, user: true },
  });
};

// Mirrors: ChurchAssignment.findOne({ isCurrent: true, isPrimary: true }).populate("church").populate("user")
exports.getLeadershipAssignment = async () => {
  return prisma.churchAssignment.findFirst({
    where: { isCurrent: true, isPrimary: true },
    include: { church: true, user: true },
  });
};

// Mirrors: ChurchAssignment.find().populate("church").populate("user")
exports.getAllAssignments = async () => {
  return prisma.churchAssignment.findMany({
    include: { church: true, user: true },
  });
};

// Mirrors: ChurchAssignment.findByIdAndDelete(id)
exports.deleteAssignment = async (id) => {
  try {
    return await prisma.churchAssignment.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2025") return null;
    throw err;
  }
};