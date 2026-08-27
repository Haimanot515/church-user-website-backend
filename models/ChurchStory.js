const mongoose = require("mongoose");

const churchStorySchema = new mongoose.Schema(
  {
    year: { type: String, required: true },
    range: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /\d{4}/.test(v),
        message: (props) =>
          `"${props.value}" is not valid — range must include a 4-digit year (e.g. "1998 - 2006").`,
      },
    },
    title: { type: String, required: true },
    desc: { type: String, required: true },
    leader: { type: String },
    leaderRole: { type: String },
    servedBy: { type: String },
    photo: { type: String },
    order: { type: Number, default: 0 }, // auto-derived from year, never set manually

    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
  },
  { timestamps: true }
);

// Extract the starting year from `range` (e.g. "1998 - 2006" -> "1998")
// and use it to fill `year` and compute `order`. Synchronous hook — no
// `next` parameter, since Mongoose 7+ no longer supports callback-style
// middleware. Just returning (or not) is enough to signal completion.
churchStorySchema.pre("validate", function () {
  if (this.range) {
    const match = this.range.match(/\d{4}/);

    if (match) {
      this.year = match[0];
      this.order = parseInt(match[0], 10);
    }
  }
});

module.exports = mongoose.model("ChurchStory", churchStorySchema);