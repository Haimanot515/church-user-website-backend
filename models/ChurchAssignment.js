const mongoose = require("mongoose");
const churchAssignmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    church: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Church",
      required: true,
    },
    role: {
      type: String,
      default: "Priest",
    },
    servingSince: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    isCurrent: {
      type: Boolean,
      default: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

churchAssignmentSchema.index({ isCurrent: 1, isPrimary: 1 });
churchAssignmentSchema.index({ user: 1, isCurrent: 1 });

module.exports = mongoose.model(
  "ChurchAssignment",
  churchAssignmentSchema
);