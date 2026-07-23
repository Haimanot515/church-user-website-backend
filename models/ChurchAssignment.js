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


    // Marks the single assignment that should be featured on the
    // public "Where I Serve Now" section of the Church page.
    // Only one assignment across the whole collection should have
    // this set to true at any given time.
    isPrimary: {
      type: Boolean,
      default: false,
    },


  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model(
  "ChurchAssignment",
  churchAssignmentSchema
);const mongoose = require("mongoose");


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


    // Marks the single assignment that should be featured on the
    // public "Where I Serve Now" section of the Church page.
    // Only one assignment across the whole collection should have
    // this set to true at any given time.
    isPrimary: {
      type: Boolean,
      default: false,
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