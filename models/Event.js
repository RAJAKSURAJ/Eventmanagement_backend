const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  eventType: { type: String, enum: ["image", "video"], required: true },
  mediaURL: { type: String, required: true },
  attendees: { type: [String], default: [] },
  attendeeListFile: { type: String },
  webLink: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Event", EventSchema);
