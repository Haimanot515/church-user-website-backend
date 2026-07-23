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


  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model(
  "ChurchAssignment",
  churchAssignmentSchema
);