const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const StudentId = require("../models/StudentId");
const AdviserId = require("../models/AdviserId");
const { studentUser, adviserUser } = require("../models/userModels");

const router = express.Router();

// Registration Route
router.post("/register", async (req, res) => {
  const { id, password, username, userType } = req.body;
  try {
    if (userType === "student") {
      const existingUser = await StudentId.findOne({ id });
      if (!existingUser) {
        return res.status(400).json({ message: "Invalid Id" });
      }
      if (existingUser.registered) {
        return res
          .status(400)
          .json({ message: "This user already registered" });
      }
      const newUser = new studentUser({ id, password, username });

      await newUser.save();
      res.status(201).json({ message: "User created successfully" });
      await StudentId.findOneAndUpdate({ id }, { registered: true });
    } else {
      const existingUser = await AdviserId.findOne({ id });
      if (!existingUser) {
        return res.status(400).json({ message: "Invalid Id" });
      }
      if (existingUser.registered) {
        return res
          .status(400)
          .json({ message: "This user already registered" });
      }
      availableTimes = { ten: [], eleven: [] };
      const newUser = new adviserUser({
        id,
        password,
        username,
        availableTimes: availableTimes,
      });

      await newUser.save();
      res.status(201).json({ message: "User created successfully" });
      await AdviserId.findOneAndUpdate({ id }, { registered: true });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { id, password, userType } = req.body;
  console.log("TYPE ,", userType);
  try {
    if (userType === "student") {
      const user = await studentUser.findOne({ id });

      const existingUser = await StudentId.findOne({ id });
      if (!existingUser.registered) {
        return res.status(400).json({ message: "This user did not register" });
      }
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      if (user.password !== password) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1h" });
      res.json({ token, userId: user._id, user });
    } else {
      const user = await adviserUser.findOne({ id });
      const existingUser = await AdviserId.findOne({ id });
      console.log(user);
      if (!existingUser.registered) {
        return res.status(400).json({ message: "This user did not register" });
      }
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
      if (user.password !== password) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1h" });
      res.json({ token, userId: user._id, user });
    }
  } catch (error) {
    res.status(500).json({ message: "Invalid credentials" });
  }
});

module.exports = router;
