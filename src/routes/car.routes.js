const express = require("express");
const carController = require("../controllers/car.controller");
const imageController = require("../controllers/carImage.controller");
const authenticate = require("../middleware/authenticate");
const { ADMIN_ROLES, requireRole } = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { uploadImages } = require("../middleware/upload");
const v = require("../validators/car.validators");

const router = express.Router();

// Car writes are admin-only for now. To let sellers manage their own listings later, relax this
// guard for the write routes and add an ownership check in car.service.
const requireAdmin = [authenticate(), requireRole(...ADMIN_ROLES)];

// Public catalogue
router.get("/", validate({ query: v.listQuery }), carController.list);

// Declared before "/:id" so "manage" isn't parsed as an id
router.get("/manage", ...requireAdmin, validate({ query: v.manageQuery }), carController.manage);

// Anonymous callers see ACTIVE cars only; admins can open any status
router.get(
  "/:id",
  authenticate({ optional: true }),
  validate({ params: v.idParam }),
  carController.getById
);

router.post("/", ...requireAdmin, validate({ body: v.createCar }), carController.create);
router.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: v.idParam, body: v.updateCar }),
  carController.update
);
router.patch(
  "/:id/status",
  ...requireAdmin,
  validate({ params: v.idParam, body: v.updateStatus }),
  carController.changeStatus
);
router.delete("/:id", ...requireAdmin, validate({ params: v.idParam }), carController.remove);

// Images: auth and id validation run before the upload is parsed
router.post(
  "/:id/images",
  ...requireAdmin,
  validate({ params: v.idParam }),
  uploadImages,
  imageController.upload
);
router.patch(
  "/:id/images/:imageId/primary",
  ...requireAdmin,
  validate({ params: v.imageParams }),
  imageController.setPrimary
);
router.delete(
  "/:id/images/:imageId",
  ...requireAdmin,
  validate({ params: v.imageParams }),
  imageController.remove
);

module.exports = router;
