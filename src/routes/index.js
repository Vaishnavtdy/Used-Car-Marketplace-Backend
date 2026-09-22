const express = require("express");
const response = require("../utils/response");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const brandRoutes = require("./brand.routes");
const carRoutes = require("./car.routes");
const homeCmsRoutes = require("./homeCms.routes");
const siteSettingsRoutes = require("./siteSettings.routes");

const router = express.Router();

router.get("/health", (req, res) => response.message(res, "API is running"));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/brands", brandRoutes);
router.use("/cars", carRoutes);
router.use("/cms/home", homeCmsRoutes);
router.use("/site-settings", siteSettingsRoutes);

module.exports = router;
