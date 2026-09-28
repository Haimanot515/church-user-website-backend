const prisma = require("../prisma/prisma.service");
const { ServiceCategory, ServiceStatus } = require("@prisma/client");

/* ------------------------------ helpers ------------------------------ */

// "true" / "on" / "1" / true -> true, "false" / "off" / "0" / false -> false,
// undefined / null / "" -> undefined (meaning "not provided")
const toBool = (v) => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  return ["true", "on", "1"].includes(String(v).toLowerCase());
};

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const assertEnum = (enumObj, value, name) => {
  if (value !== undefined && !Object.values(enumObj).includes(value)) {
    throw httpError(
      `Invalid ${name}: "${value}". Allowed: ${Object.values(enumObj).join(", ")}`
    );
  }
};

/* ------------------------------ queries ------------------------------ */

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

/* ------------------------------ create ------------------------------- */

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

  // Treat empty strings from forms as "not provided" so schema defaults apply
  const cat = category || undefined;
  const stat = status || undefined;

  assertEnum(ServiceCategory, cat, "category");
  assertEnum(ServiceStatus, stat, "status");

  return prisma.service.create({
    data: {
      title,
      description,
      imageUrl,
      day,
      time,
      schedule: `${day}, ${time}`, // replaces pre("save") hook
      category: cat,
      languageId: language,
      location,
      isFeatured: toBool(isFeatured) ?? false,
      status: stat,
    },
  });
};

/* ------------------------------ update ------------------------------- */

exports.updateService = async (id, body, existing, imageUrl) => {
  // Use new day/time if provided, otherwise fall back to existing,
  // so schedule stays correct even on partial updates.
  const day = body.day ?? existing.day;
  const time = body.time ?? existing.time;

  const { title, description, category, location, status, language, isFeatured } = body;

  assertEnum(ServiceCategory, category, "category");
  assertEnum(ServiceStatus, status, "status");

  const featured = toBool(isFeatured);

  return prisma.service.update({
    where: { id },
    data: {
      // Explicit whitelist: only these fields can be changed from the request
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(location !== undefined && { location }),
      ...(status !== undefined && { status }),
      ...(language && { languageId: language }),
      ...(featured !== undefined && { isFeatured: featured }),
      ...(imageUrl && { imageUrl }),
      day,
      time,
      schedule: `${day}, ${time}`, // replaces pre("save") hook
      updatedAt: new Date(), // needed: schema uses @default(now()), not @updatedAt
    },
  });
};

/* ------------------------------ delete ------------------------------- */

exports.deleteService = async (id) => {
  return prisma.service.delete({ where: { id } }).catch(() => null);
};

/* --------------------------- featured / active ----------------------- */

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