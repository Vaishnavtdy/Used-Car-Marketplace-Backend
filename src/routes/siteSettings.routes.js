const express = require("express");
const controller = require("../controllers/siteSettings.controller");
const authenticate = require("../middleware/authenticate");
const { ADMIN_ROLES, requireRole } = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { uploadLogo } = require("../middleware/upload");
const v = require("../validators/siteSettings.validators");

const router = express.Router();

// The one public endpoint: the brand name / logo the site's chrome renders.
router.get("/", controller.publicGet);

router.use(authenticate(), requireRole(...ADMIN_ROLES));

router.put("/", validate({ body: v.updateBrandName }), controller.updateBrandName);
router.post("/logo", uploadLogo, controller.uploadLogo);
router.delete("/logo", controller.removeLogo);

module.exports = router;
