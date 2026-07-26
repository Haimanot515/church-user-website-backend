const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({
  email: String,
  active: Boolean,
  subscribedAt: Date,
  unsubscribedAt: Date,
});

module.exports = mongoose.model("Subscriber", subscriberSchema);