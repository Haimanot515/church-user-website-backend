const prisma = require("../prisma/prisma.service");

// Mirrors: Subscriber.findOne({ email })
exports.findByEmail = async (email) => {
  return prisma.subscriber.findFirst({ where: { email } });
};

// Mirrors:
//   subscriber.active = true;
//   subscriber.subscribedAt = new Date();
//   subscriber.unsubscribedAt = null;
//   await subscriber.save();
exports.reactivate = async (id) => {
  return prisma.subscriber.update({
    where: { id },
    data: {
      active: true,
      subscribedAt: new Date(),
      unsubscribedAt: null,
    },
  });
};

// Mirrors: Subscriber.create({ email, active: true, subscribedAt: new Date() })
exports.create = async (email) => {
  return prisma.subscriber.create({
    data: {
      email,
      active: true,
      subscribedAt: new Date(),
    },
  });
};

// Mirrors: subscriber.active = false; subscriber.unsubscribedAt = new Date(); await subscriber.save()
exports.deactivate = async (id) => {
  return prisma.subscriber.update({
    where: { id },
    data: {
      active: false,
      unsubscribedAt: new Date(),
    },
  });
};

// Mirrors: Subscriber.find({ active: true }).sort({subscribedAt:-1})
exports.getAllActive = async () => {
  return prisma.subscriber.findMany({
    where: { active: true },
    orderBy: { subscribedAt: "desc" },
  });
};