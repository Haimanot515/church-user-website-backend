// models/Message.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    fromAdmin: {
      type: Boolean,
      required: true,
    },
    readByAdmin: {
      type: Boolean,
      default: false,
    },
    clientId: { type: String, index: true }, // for optimistic UI
  },
  { timestamps: true } // createdAt is critical for chat ordering
);

// Compound index for chat pagination
MessageSchema.index({ threadId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);
