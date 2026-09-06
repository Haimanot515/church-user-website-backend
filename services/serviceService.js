const prisma = require("../prisma/prisma.service");
const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "services" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

exports.getServices = async ({ page, limit, category, language }) => {
  const skip = (page - 1) * limit;
  const where = {
    status: "active",
    languageId: language,
    ...(category && { category }),
  };

  const [services, totalServices] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { language: { select: { name: true, code: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services,
    currentPage: page,
    totalPages: Math.ceil(totalServices / limit),
    totalServices,
  };
};

exports.getServiceById = async (id) => {
  return prisma.service.findUnique({
    where: { id },
    include: { language: { select: { name: true, code: true } } },
  });
};

exports.createService = async (body, file) => {
  let imageUrl = "";
  if (file) {
    const result = await uploadToCloudinary(file.buffer);
    imageUrl = result.secure_url;
  }

  const day = body.day;
  const time = body.time;

  return prisma.service.create({
    data: {
      title: body.title,
      description: body.description,
      imageUrl,
      day,
      time,
      schedule: `${day}, ${time}`, // replaces pre("save") hook
      category: body.category,
      languageId: body.language,
      location: body.location,
      isFeatured: body.isFeatured || false,
      status: body.status || "active",
    },
  });
};

exports.updateService = async (id, body, file) => {
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) return null;

  let imageUrl;
  if (file) {
    const result = await uploadToCloudinary(file.buffer);
    imageUrl = result.secure_url;
  }

  // Resolve day/time: use new values if provided, otherwise fall back
  // to existing, so schedule stays correct even on partial updates.
  const day = body.day ?? existing.day;
  const time = body.time ?? existing.time;

  return prisma.service.update({
    where: { id },
    data: {
      ...body,
      ...(imageUrl && { imageUrl }),
      day,
      time,
      schedule: `${day}, ${time}`, // replaces pre("save") hook
      updatedAt: new Date(),
    },
  });
};

exports.deleteService = async (id) => {
  return prisma.service.delete({ where: { id } }).catch(() => null);
};

exports.getFeaturedServices = async (language) => {
  return prisma.service.findMany({
    where: { isFeatured: true, status: "active", languageId: language },
    include: { language: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
};

exports.getActiveServices = async (language) => {
  return prisma.service.findMany({
    where: { status: "active", languageId: language },
    include: { language: { select: { name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
};