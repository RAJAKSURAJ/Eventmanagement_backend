const express = require("express");
const multer = require("multer");
const Event = require("../models/Event");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Access Denied" });

  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid Token" });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.post(
  "/add",
  verifyToken,
  upload.fields([{ name: "media" }, { name: "attendeeList" }]),
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { title, date, eventType, webLink, attendees } = req.body;

      if (!title || !date || !eventType) {
        return res
          .status(400)
          .json({ error: "Title, Date, and Event Type are required" });
      }

      const event = new Event({
        title,
        date,
        eventType,
        mediaURL: req.files["media"] ? req.files["media"][0].path : null,
        attendeeListFile: req.files["attendeeList"]
          ? req.files["attendeeList"][0].path
          : null,
        attendees: attendees
          ? attendees.split(",").map((name) => name.trim())
          : [],
        webLink,
        createdBy: req.user.id,
      });

      await event.save();
      res.status(201).json({ message: "Event added successfully", event });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to add event" });
    }
  }
);

router.get("/", async (req, res) => {
  try {
    const events = await Event.find().populate("createdBy", "name");
    res.json(events);
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch events" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Unauthorized" });

  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete event" });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    console.log("Received files:", req.files);
    console.log("Received body:", req.body);

    const { title, date, eventType, webLink, attendees } = req.body;
    let updatedData = { title, date, eventType, webLink };

    if (req.files && req.files["media"]) {
      updatedData.mediaURL = req.files["media"][0].path;
    }
    if (req.files && req.files["attendeeList"]) {
      updatedData.attendeeListFile = req.files["attendeeList"][0].path;
    }

    if (attendees) {
      updatedData.attendees = attendees.split(",").map((name) => name.trim());
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

module.exports = router;
