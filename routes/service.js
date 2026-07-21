const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");


const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getFeaturedServices,
  getActiveServices
} = require("../controllers/serviceController");



// PUBLIC: Get all services
router.get(
  "/",
  getServices
);



// PUBLIC: Get featured services
router.get(
  "/featured",
  getFeaturedServices
);



// PUBLIC: Get active services
router.get(
  "/active",
  getActiveServices
);



// PUBLIC: Get single service by ID
// KEEP THIS LAST
router.get(
  "/:id",
  getServiceById
);




// ADMIN ONLY: Create service
router.post(
  "/",
  auth,
  adminAuth,
  upload.single("image"),
  createService
);




// ADMIN ONLY: Update service
router.put(
  "/:id",
  auth,
  adminAuth,
  upload.single("image"),
  updateService
);




// ADMIN ONLY: Delete service
router.delete(
  "/:id",
  auth,
  adminAuth,
  deleteService
);



module.exports = router;