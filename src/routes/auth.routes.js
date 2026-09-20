const express = require("express");
const controller = require("../controllers/auth.controller");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const { loginLimiter, registerLimiter, refreshLimiter } = require("../middleware/rateLimit");
const schemas = require("../validators/auth.validators");

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  validate({ body: schemas.register }),
  controller.register
);
router.post("/login", loginLimiter, validate({ body: schemas.login }), controller.login);
router.post("/refresh", refreshLimiter, controller.refresh);
router.post("/logout", controller.logout);
router.post("/logout-all", authenticate({ allowPasswordChange: true }), controller.logoutAll);

router.get("/me", authenticate({ allowPasswordChange: true }), controller.me);
router.post(
  "/change-password",
  authenticate({ allowPasswordChange: true }),
  validate({ body: schemas.changePassword }),
  controller.changePassword
);

module.exports = router;
