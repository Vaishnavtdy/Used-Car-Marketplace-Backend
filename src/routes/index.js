const express = require("express");
const response = require("../utils/response");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const carRoutes = require("./car.routes");

const router = express.Router();

router.get("/health", (req, res) => response.message(res, "API is running"));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/cars", carRoutes);

module.exports = router;
