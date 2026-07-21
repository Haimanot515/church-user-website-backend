const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminMiddleware");

const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");


// PUBLIC: Get all categories
router.get("/", getCategories);


// PUBLIC: Get single category by ID
// KEEP THIS LAST
router.get("/:id", getCategoryById);


// ADMIN ONLY: Create category
router.post(
  "/",
  auth,
  adminAuth,
  createCategory
);


// ADMIN ONLY: Update category
router.put(
  "/:id",
  auth,
  adminAuth,
  updateCategory
);


// ADMIN ONLY: Delete category
router.delete(
  "/:id",
  auth,
  adminAuth,
  deleteCategory
);


module.exports = router;