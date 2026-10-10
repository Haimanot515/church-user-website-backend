const router = require("express").Router();
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const upload = require("../middleware/uploadMiddleware");
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getFeaturedServices,
  getActiveServices,
} = require("../controllers/serviceController");

// PUBLIC: Get all services
router.get("/", getServices);

// PUBLIC: Get featured services
router.get("/featured", getFeaturedServices);

// PUBLIC: Get active services
router.get("/active", getActiveServices);

// PUBLIC: Get single service by ID
// KEEP THIS LAST
router.get("/:id", getServiceById);

// ADMIN ONLY: Create service
router.post("/", ...protect(P.SERVICE_MANAGE, "Service"), upload.single("image"), createService);

// ADMIN ONLY: Update service
router.put("/:id", ...protect(P.SERVICE_MANAGE, "Service"), upload.single("image"), updateService);

// ADMIN ONLY: Delete service
router.delete("/:id", ...protect(P.SERVICE_MANAGE, "Service"), deleteService);

module.exports = router;
