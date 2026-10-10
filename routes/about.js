const router = require("express").Router();
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const upload = require("../middleware/uploadMiddleware");
const {
  getAbout,
  createAbout,
  updateAbout,
  deleteAbout,
} = require("../controllers/aboutController");

// GET: Publicly accessible to view the about section
router.get("/", getAbout);

// POST: Restricted to admin; used to create the about section for the first time
router.post("/", ...protect(P.ABOUT_MANAGE, "About"), upload.single("image"), createAbout);

// PUT: Restricted to admin; used to update a specific about entry by ID
router.put("/:id", ...protect(P.ABOUT_MANAGE, "About"), upload.single("image"), updateAbout);

// DELETE: Restricted to admin; used to delete a specific about entry by ID
router.delete("/:id", ...protect(P.ABOUT_MANAGE, "About"), deleteAbout);

module.exports = router;
