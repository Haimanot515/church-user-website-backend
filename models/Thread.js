// models/Thread.js
const mongoose = require("mongoose");

const ThreadSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      index: true,
    },
    unreadForAdmin: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true } // createdAt, updatedAt
);

// Index for inbox pagination
ThreadSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Thread", ThreadSchema);
