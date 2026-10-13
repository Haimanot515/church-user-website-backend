const express = require("express");
const protect = require("../middleware/protect");
const { P } = require("../config/permissions");
const c = require("../controllers/misbakController");

const router = express.Router();

router.get("/today", c.getToday);
router.get("/date/:date", c.getByDate);

router.get("/admin", ...protect(P.MISBAK_MANAGE, "Misbak", { audit: false }), c.list);
router.post(
  "/admin/import",
  ...protect(P.MISBAK_MANAGE, "Misbak", { action: "misbak.import", entityId: () => "import" }),
  express.json({ limit: "2mb" }),
  c.importMany
);
router.get("/admin/:id", ...protect(P.MISBAK_MANAGE, "Misbak", { audit: false }), c.getById);

router.post("/", ...protect(P.MISBAK_MANAGE, "Misbak"), c.create);
router.put("/:id", ...protect(P.MISBAK_MANAGE, "Misbak"), c.update);
router.patch("/:id/status", ...protect(P.MISBAK_MANAGE, "Misbak"), c.setStatus);
router.delete("/:id", ...protect(P.MISBAK_MANAGE, "Misbak"), c.remove);

module.exports = router;
