const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const prisma = require("./prisma/prisma.service");
const { getAllowedOrigins } = require("./config/env");
const resolveLanguage = require("./middleware/resolveLanguage");
const errorHandler = require("./middleware/errorHandler");
const requestContext = require("./middleware/requestContext");
const { globalLimiter } = require("./middleware/rateLimiters");
const { trustProxyHops } = require("./config/security");

const app = express();

app.set("trust proxy", trustProxyHops);
app.disable("x-powered-by");
app.use(requestContext);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Captcha-Token",
      "X-Reauth-Credential",
      "Accept-Language",
    ],
    exposedHeaders: ["X-Request-Id"],
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

const jsonParser = express.json({ limit: "100kb" });
app.use((req, res, next) =>
  req.path === "/api/misbak/admin/import" ? next() : jsonParser(req, res, next)
);
app.use(cookieParser());

app.get("/", (req, res) => res.send("Church website backend is running."));
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "up" });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(503).json({ status: "error", database: "down" });
  }
});

app.use(["/api/auth", "/api/admin"], (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/api", globalLimiter);
app.use("/api", resolveLanguage);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/landingheros", require("./routes/landingHero"));
app.use("/api/posts", require("./routes/post"));
app.use("/api/media", require("./routes/media"));
app.use("/api/languages", require("./routes/language"));
app.use("/api/categories", require("./routes/category"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/about", require("./routes/about"));
app.use("/api/promotions", require("./routes/promotion"));
app.use("/api/subscribers", require("./routes/subscriber"));
app.use("/api/churches", require("./routes/church"));
app.use("/api/church-story", require("./routes/churchStory"));
app.use("/api/mission-vision", require("./routes/mission-vision"));
app.use("/api/bank-accounts", require("./routes/bankAccount"));
app.use("/api/services", require("./routes/service"));
app.use("/api/faq", require("./routes/faq"));
app.use("/api/misbak", require("./routes/misbak"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin", require("./routes/access"));
app.use("/api/church-persons", require("./routes/churchPerson"));
app.use("/api/homeheros", require("./routes/homeHero"));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use(errorHandler);

module.exports = app;
