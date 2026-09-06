require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const prisma = require("./prisma/prisma.service");

// --- Standard Routes ---
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/post");
const mediaRoutes = require("./routes/media");
const languageRoutes = require("./routes/language");
const categoryRoutes = require("./routes/category");
const contactRoutes = require("./routes/contact");
const aboutRoutes = require("./routes/about");
const promotionRoutes = require("./routes/promotion");
const subscriberRoutes = require("./routes/subscriber");
const churchRoutes = require("./routes/church");
const churchStoryRoutes = require("./routes/churchStory");
const missionVisionRoutes = require("./routes/mission-vision");
const bankAccountRoutes = require("./routes/bankAccount");
const serviceRoutes = require("./routes/service");
const faqRoutes = require("./routes/faq");
const adminRoutes = require("./routes/admin");
const churchPersonRoutes = require("./routes/churchPerson");
const homeHeroRoutes = require("./routes/homeHero");
const landingRoutes = require("./routes/landingHero");

const resolveLanguage = require("./middleware/resolveLanguage");

const app = express();

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5176",
      "http://localhost:5173",
      "http://localhost:5174",
      "https://church-website-admin.onrender.com",
      "https://my-portfolio-l9o0.onrender.com",
      "https://church-user-website-frontend.onrender.com"
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(resolveLanguage);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const startServer = async () => {
  try {
    // Connect to Postgres via Prisma
    await prisma.connect();

    app.use("/api/auth", authRoutes);
    app.use("/api/landingheros", landingRoutes);
    app.use("/api/posts", postRoutes);
    app.use("/api/media", mediaRoutes);
    app.use("/api/languages", languageRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/contact", contactRoutes);
    app.use("/api/about", aboutRoutes);
    app.use("/api/promotions", promotionRoutes);
    app.use("/api/subscribers", subscriberRoutes);
    app.use("/api/churches", churchRoutes);
    app.use("/api/church-story", churchStoryRoutes);
    app.use("/api/mission-vision", missionVisionRoutes);
    app.use("/api/bank-accounts", bankAccountRoutes);
    app.use("/api/services", serviceRoutes);
    app.use("/api/faq", faqRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/church-persons", churchPersonRoutes);
    app.use("/api/homeheros", homeHeroRoutes);

    app.get("/", (req, res) => {
      res.send("Portfolio Backend is running!");
    });

    if (process.env.NODE_ENV === "production") {
      app.use(express.static(path.join(__dirname, "client/build")));
    }

    app.use((req, res) => {
      res.status(404).json({
        message: `Route ${req.originalUrl} not found. Check if /api prefix or plural 's' is missing.`
      });
    });

    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ message: "Server error" });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("❌ Server startup error:", err);
    process.exit(1);
  }
};

startServer();