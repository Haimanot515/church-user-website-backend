const serviceService = require("../services/serviceService");
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

// GET ALL SERVICES (Newest first, paginated)
exports.getServices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { services, totalServices } = await serviceService.getServices({
      languageId: req.language,
      category: req.query.category,
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      services,
      currentPage: page,
      totalPages: Math.ceil(totalServices / limit),
      totalServices,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET SINGLE SERVICE
exports.getServiceById = async (req, res) => {
  try {
    const service = await serviceService.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE SERVICE
exports.createService = async (req, res) => {
  try {
    let imageUrl = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const savedService = await serviceService.createService({
      title: req.body.title,
      description: req.body.description,
      imageUrl,
      day: req.body.day,
      time: req.body.time,
      category: req.body.category,
      language: req.body.language,
      location: req.body.location,
      isFeatured: req.body.isFeatured || false,
      status: req.body.status || "active",
    });

    res.status(201).json(savedService);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create service", error: err.message });
  }
};

// UPDATE SERVICE
exports.updateService = async (req, res) => {
  try {
    const existing = await serviceService.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Service not found" });
    }

    let imageUrl;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const updatedService = await serviceService.updateService(
      req.params.id,
      req.body,
      existing,
      imageUrl
    );

    res.json(updatedService);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE SERVICE
exports.deleteService = async (req, res) => {
  try {
    const service = await serviceService.deleteService(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET FEATURED SERVICES
exports.getFeaturedServices = async (req, res) => {
  try {
    const services = await serviceService.getFeaturedServices(req.language);
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ACTIVE SERVICES
exports.getActiveServices = async (req, res) => {
  try {
    const services = await serviceService.getActiveServices(req.language);
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};