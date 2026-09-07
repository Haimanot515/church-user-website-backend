const prisma = require("../prisma/prisma.service");

// GET ALL SERVICES (Newest first, paginated)
exports.getServices = async ({ languageId, category, skip, take }) => {
  const where = {
    status: "active",
    languageId,
    ...(category && { category }),
  };

  const [services, totalServices] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { language: { select: { name: true, code: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.service.count({ where }),
  ]);

  return { services, totalServices };
};

// GET SINGLE SERVICE
exports.getServiceById = async (id) => {
  return prisma.service.findUnique({
    where: { id },
    include: { language: { select: { name: true, code: true } } },
  });
};

// alias — controller checks existence via this before update
exports.findById = exports.getServiceById;

// CREATE SERVICE
exports.createService = async (data) => {
  const {
    title,
    description,
    imageUrl,
    day,
    time,
    category,
    language,
    location,
    isFeatured,
    status,
  } = data;

  return prisma.service.create({
    data: {
      title,
      description,
      imageUrl,
      day,
      time,
      schedule: `${day}, ${time}`, // replaces pre("save") hook
      category,
      languageId: language,
      location,
      isFeatured,
      status,
    },
  });
};

// UPDATE SERVICE
exports.updateService = async (id, body, existing, imageUrl) => {
  // Resolve day/time: use new values if provided, otherwise fall back
  // to existing, so schedule stays correct even on partial updates.
  const day = body.day ?? existing.day;
  const time = body.time ?? existing.time;

  const { language, ...rest } = body; // strip raw "language" key, remap to languageId

  return prisma.service.update({
    where: { id },
    data: {
      ...rest,
      ...(language && { languageId: language }),
      ...(imageUrl && { imageUrl }),
      day,
      time,
      schedule: `${day}, ${time}`, // replaces pre("save") hook
      updatedAt: new Date(),
    },
  });
};

// DELETE SERVICE
exports.deleteService = async (id) => {
  return prisma.service.delete({ where: { id } }).catch(() => null);
};

// GET FEATURED SERVICES
exports.getFeaturedServices = async (language) => {
  return prisma.service.findMany({
    where: { isFeatured: true, status: "active", languageId: language },
    include: { language: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
};

// GET ACTIVE SERVICES
exports.getActiveServices = async (language) => {
  return prisma.service.findMany({
    where: { status: "active", languageId: language },
    include: { language: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
};