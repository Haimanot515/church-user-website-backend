const Subscriber = require("../models/Subscriber");


// SUBSCRIBE (create a new subscriber)
exports.subscribe = async (req, res) => {

  try {

    const email = req.body.email?.trim().toLowerCase();

    if (!email) {

      return res.status(400).json({
        message: "Email is required"
      });

    }

    const existingSubscriber = await Subscriber.findOne({
      email
    });

    if (existingSubscriber) {

      if (existingSubscriber.status === "unsubscribed") {

        existingSubscriber.status = "active";
        existingSubscriber.subscribedAt = Date.now();
        existingSubscriber.unsubscribedAt = null;
        existingSubscriber.updatedAt = Date.now();

        await existingSubscriber.save();

        return res.json(existingSubscriber);

      }

      return res.status(400).json({
        message: "Email is already subscribed"
      });

    }

    const subscriber = new Subscriber({
      email
    });

    const savedSubscriber = await subscriber.save();

    res.status(201).json(savedSubscriber);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// GET ALL SUBSCRIBERS
exports.getSubscribers = async (req, res) => {

  try {

    const subscribers = await Subscriber.find()
      .sort({ createdAt: -1, _id: -1 });

    res.json(subscribers);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// GET SINGLE SUBSCRIBER
exports.getSubscriberById = async (req, res) => {

  try {

    const subscriber = await Subscriber.findById(req.params.id);

    if (!subscriber) {

      return res.status(404).json({
        message: "Subscriber not found"
      });

    }

    res.json(subscriber);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// UNSUBSCRIBE
exports.unsubscribe = async (req, res) => {

  try {

    const email = req.body.email?.trim().toLowerCase();

    if (!email) {

      return res.status(400).json({
        message: "Email is required"
      });

    }

    const subscriber = await Subscriber.findOne({
      email
    });

    if (!subscriber) {

      return res.status(404).json({
        message: "Subscriber not found"
      });

    }

    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = Date.now();
    subscriber.updatedAt = Date.now();

    await subscriber.save();

    res.json({
      message: "Unsubscribed successfully"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};




// DELETE SUBSCRIBER
exports.deleteSubscriber = async (req, res) => {

  try {

    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);

    if (!subscriber) {

      return res.status(404).json({
        message: "Subscriber not found"
      });

    }

    res.json({
      message: "Subscriber deleted successfully"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};