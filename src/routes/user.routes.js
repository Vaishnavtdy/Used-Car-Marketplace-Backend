const express = require("express");
const controller = require("../controllers/user.controller");
const authenticate = require("../middleware/authenticate");
const { ADMIN_ROLES, requireRole } = require("../middleware/authorize");
const validate = require("../middleware/validate");
const v = require("../validators/user.validators");

const router = express.Router();

// Self-service (declared before "/:id" so "me" isn't parsed as an id)
router.patch("/me", authenticate(), validate({ body: v.updateMe }), controller.updateMe);

// Everything below requires ADMIN or SUPER_ADMIN
router.use(authenticate(), requireRole(...ADMIN_ROLES));

router.get("/", validate({ query: v.listQuery }), controller.list);
router.post("/", validate({ body: v.createUser }), controller.create);
router.get("/:id", validate({ params: v.idParam }), controller.getById);
router.patch("/:id", validate({ params: v.idParam, body: v.updateUser }), controller.update);
router.post(
  "/:id/reset-password",
  validate({ params: v.idParam, body: v.resetPassword }),
  controller.resetPassword
);

module.exports = router;
