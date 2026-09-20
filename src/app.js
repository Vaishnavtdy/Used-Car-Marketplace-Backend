const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Needed so req.ip (used for rate limiting) is the client IP when running behind a proxy.
app.set("trust proxy", env.TRUST_PROXY);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Uploaded car images. Helmet's default Cross-Origin-Resource-Policy (same-origin) would stop a
// frontend on another origin from displaying them, so relax it for this path only. In production,
// prefer serving this directory from a CDN / reverse proxy on a persistent volume.
app.use(
  "/uploads",
  (req, res, next) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(env.UPLOAD_DIR, { dotfiles: "deny", index: false, maxAge: "7d", immutable: true })
);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
