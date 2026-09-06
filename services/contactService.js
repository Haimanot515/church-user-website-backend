const prisma = require("../prisma/prisma.service");

// Mirrors: Thread.findOne({ userEmail: email })
exports.findThreadByEmail = async (email) => {
  return prisma.thread.findFirst({ where: { userEmail: email } });
};

// Mirrors: Thread.create({ userName, userEmail, unreadForAdmin: 0 })
exports.createThread = async (name, email) => {
  return prisma.thread.create({
    data: {
      userName: name,
      userEmail: email,
      unreadForAdmin: 0,
    },
  });
};

// Mirrors: Message.create({ threadId, message, fromAdmin: false, createdAt: new Date() })
exports.createMessage = async (threadId, message) => {
  return prisma.message.create({
    data: {
      threadId,
      message,
      fromAdmin: false,
    },
  });
};

// Mirrors:
//   thread.lastMessage = message;
//   thread.lastMessageAt = new Date();
//   thread.unreadForAdmin += 1;
//   await thread.save();
exports.updateThreadAfterMessage = async (threadId, message) => {
  return prisma.thread.update({
    where: { id: threadId },
    data: {
      lastMessage: message,
      lastMessageAt: new Date(),
      unreadForAdmin: { increment: 1 },
    },
  });
};