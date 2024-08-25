const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: String, // Can be "student" or "adviser"
  },
  senderName: {
    type: String,
  },
  receiverName: { type: String },
  content: {
    type: String,
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
});
const TicketSchema = new mongoose.Schema({
  timeStamp: { type: String, required: true },
  date: { type: String, required: true },
  title: { type: String, required: true },
  course: { type: String },
  name: { type: String, required: false },
  ReceiverId: { type: String, required: true },
  ReceiverTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }, // Add this field
  Duration: { type: String },
  Hour: { type: String },
  Minutes: { type: String },
  messages: [messageSchema],
  confirmedDuration: { type: Boolean },
  conclusion: { type: String, default: "" },
  ended: { type: Boolean },
});
const minutesSchema = new mongoose.Schema({ minutes: { type: String } });
const TimeSchema = new mongoose.Schema({
  ten: [minutesSchema],
  eleven: [minutesSchema],
});
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  password: { type: String, required: true, default: "" },
  tickets: [TicketSchema],
});

const studentUser = mongoose.model("studentUser", UserSchema);
const adviserUser = mongoose.model("adviserUser", UserSchema);
const time = mongoose.model("Hour", TimeSchema);
module.exports = { studentUser, adviserUser, time };
