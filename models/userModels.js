const mongoose = require("mongoose");

const TimeSchema = new mongoose.Schema({
  ten: [],
  eleven: [],
});

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
  ReceiverTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
  Duration: { type: String },
  Hour: { type: String },
  Minutes: { type: String },
  messages: [messageSchema],
  confirmedDuration: { type: Boolean },
  conclusion: { type: String, default: "" },
  ended: { type: Boolean },
});

const studentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  password: { type: String, required: true, default: "" },
  tickets: [TicketSchema],
});
const adviserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  password: { type: String, required: true, default: "" },
  tickets: [TicketSchema],
  availableTimes: { type: TimeSchema, default: {} }, // Add this line to include time schema
});
const studentUser = mongoose.model("studentUser", studentSchema);
const adviserUser = mongoose.model("adviserUser", adviserSchema);

module.exports = { studentUser, adviserUser };
