const mongoose = require("mongoose");

const StudentIdSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  registered: { type: Boolean, required: true, default: false },
});

const StudentId = mongoose.model("StudentId", StudentIdSchema);

module.exports = StudentId;
