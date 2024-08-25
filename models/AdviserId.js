const mongoose = require("mongoose");

const AdviserIdSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  registered: { type: Boolean, required: true, default: false },
});

const AdviserId  = mongoose.model("AdviserId", AdviserIdSchema);

module.exports = AdviserId;
