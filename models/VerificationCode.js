const mongoose = require("mongoose");

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  DBcode: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("VerificationCode", verificationCodeSchema);
