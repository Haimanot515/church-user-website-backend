const router = require("express").Router();

const protect = require("../middleware/protect");
const { P } = require("../config/permissions");

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
router.post("/", ...protect(P.CATEGORY_MANAGE, "Category"), createCategory);

// ADMIN ONLY: Update category
router.put("/:id", ...protect(P.CATEGORY_MANAGE, "Category"), updateCategory);

// ADMIN ONLY: Delete category
router.delete("/:id", ...protect(P.CATEGORY_MANAGE, "Category"), deleteCategory);

module.exports = router;
