const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});
app.use(cors());
app.use(express.json());

const MONGO_DB_URL =
  process.env.MONGO_DB_URL ||
  "mongodb+srv://musharizh56:admin@cluster0.clvs4os.mongodb.net/GraduationProject";
mongoose
  .connect(MONGO_DB_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((e) => console.log(e));

const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/ticket")(io); // Pass `io` to routes

app.use("/api/auth", authRoutes);
app.use("/api/ticket", ticketRoutes);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join user-specific room
  socket.on("joinRoom", ({ userId }) => {
    socket.join(userId);
    // console.log(`User ${userId} joined their specific room.`);
  });

  // Join ticket-specific rooms
  socket.on("joinTicketRoom", ({ studentTicketId, adviserTicketId }) => {
    socket.join(studentTicketId);
    socket.join(adviserTicketId);
    // console.log(
    //   `User ${socket.id} joined ticket rooms: ${studentTicketId}, ${adviserTicketId}`
    // );
  });

  // Leave ticket-specific rooms
  socket.on("leaveTicketRoom", ({ studentTicketId, adviserTicketId }) => {
    socket.leave(studentTicketId);
    socket.leave(adviserTicketId);
    // console.log(
    //   `User ${socket.id} left ticket rooms: ${studentTicketId}, ${adviserTicketId}`
    // );
  });

  // Handle new messages
  socket.on("newMessage", (message) => {
    // console.log("New message sent:", message);
    io.to(message.studentTicketId).emit("newMessage", message.newMessage);
    io.to(message.adviserTicketId).emit("newMessage", message.newMessage);
  });

  // Handle ticket creation
  socket.on("ticketCreated", (ticketDetails) => {
    // console.log("New ticket created:", ticketDetails);

    const { studentId, adviserId } = ticketDetails;
    io.to(studentId).emit("ticketCreated", ticketDetails.studentTicket);
    io.to(adviserId).emit("ticketCreated", ticketDetails.adviserTicket);
  });
  socket.on("sessionEnded", (sessionDetails) => {
    console.log("Session ended with conclusion:", sessionDetails);

    // Emit the sessionEnded event to both the student and adviser rooms
    io.to(sessionDetails.adviserTicketId).emit("sessionEnded", sessionDetails);
    io.to(sessionDetails.studentTicketId).emit("sessionEnded", sessionDetails);
  });

  socket.on("durationUpdated", (requestBody) => {
    // console.log("new Duration: ", requestBody.data);

    io.to(requestBody.data.adviserTicket._id).emit(
      "durationUpdated",
      requestBody.data.adviserTicket
    );
    io.to(requestBody.data.adviserTicket.ReceiverTicketId).emit(
      "durationUpdated",
      requestBody.data.studentTicket
    );
  });
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
