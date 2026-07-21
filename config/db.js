require("dotenv").config(); // Make sure this is at the top of your main server file

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1); // exit process with failure
  }
};

module.exports = connectDB;
