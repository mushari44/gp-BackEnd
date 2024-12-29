  const mongoose = require("mongoose");

  const HourSchema = new mongoose.Schema({
    day: { type: String, required: true },
    hours: [
      {
        start: { type: String, required: true },

        end: { type: String, required: true },
        minutes: [
          {
            hour: Number,
            minutes: [Number],
          },
        ],
      },
    ],
  });
  const officeHourSchema = new mongoose.Schema({
    Days: [HourSchema],
  });

  const messageSchema = new mongoose.Schema({
    sender: {
      type: String,
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
    accepted: { type: Boolean },
    timeStamp: { type: String, required: true },
    date: { type: String, required: true },
    title: { type: String, required: true },
    course: { type: String },
    name: { type: String, required: false },
    ReceiverId: { type: String, required: true },
    ReceiverTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    Durations: { type: String },
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
    supervisor: { type: String, default: "" },
    tickets: [TicketSchema],
  });
  const adviserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    id: { type: String, required: true, unique: true },
    password: { type: String, required: true, default: "" },
    students: [],
    tickets: [TicketSchema],
    availableTimes: { type: officeHourSchema, default: {} },
  });
  const adminSchema = new mongoose.Schema({
    freeSupervisors: [{ type: String, default: "" }], // List of available supervisors
    freeStudents: [{ type: String, default: "" }], // List of available students
    assignedSupervisors: [
      {
        adviser: { type: String, required: true, default: "" },
        students: [{ type: String, required: true, default: "" }],
      },
    ],
  });

  const studentUser = mongoose.model("studentUser", studentSchema);
  const adviserUser = mongoose.model("adviserUser", adviserSchema);
  const adminUser = mongoose.model("adminUser", adminSchema);

  module.exports = { studentUser, adviserUser, adminUser };
