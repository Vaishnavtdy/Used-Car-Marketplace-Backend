const express = require("express");
const controller = require("../controllers/brand.controller");
const authenticate = require("../middleware/authenticate");
const { ADMIN_ROLES, requireRole } = require("../middleware/authorize");
const validate = require("../middleware/validate");
const v = require("../validators/brand.validators");

const router = express.Router();

router.get("/", controller.list);

// Brand writes are admin-only, like car writes
router.use(authenticate(), requireRole(...ADMIN_ROLES));

router.post("/", validate({ body: v.createBrand }), controller.create);
router.patch("/:id", validate({ params: v.idParam, body: v.updateBrand }), controller.update);
router.delete("/:id", validate({ params: v.idParam }), controller.remove);

module.exports = router;
