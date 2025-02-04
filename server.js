const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.post("/api/chatbot", async (req, res) => {
  try {
    const { message } = req.body;
    console.log(message);
    
    // Forward the request to the Flask server
    const flaskResponse = await axios.post(
      "https://gp-backend-chatbot.onrender.com/api/chatbot",
      {
        message,
      }
    );

    // Send the Flask response back to the client
    res.json(flaskResponse.data);
  } catch (error) {
    console.error("Error communicating with Flask server:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

const MONGO_DB_URL =
  process.env.MONGO_DB_URL || "mongodb://127.0.0.1:27017/GraduationProject";
// "mongodb+srv://musharizh56:admin@cluster0.clvs4os.mongodb.net/GraduationProject";
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
// In your server setup
socket.on("updateTicket", ({ type, newData, studentTicketId, adviserTicketId }) => {
  console.log("update ticket type : ", type, " new data : ", newData , " student ticket id : ", studentTicketId, " adviser ticket id : ", adviserTicketId);

  // Emit the update to ONLY the relevant rooms
  // This ensures only the student and adviser in those rooms get the event
  io.to(studentTicketId).emit("updateTicket", newData, type);
  io.to(adviserTicketId).emit("updateTicket", newData, type);
});

  // Handle new messages
  // socket.on("newMessage", (message, type) => {
  //   console.log("New message sent:", message, " Type : ", type);
  //   io.emit("newMessage", message.newMessage);
  // });

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
    // io.emit("sessionEnded", sessionDetails);

    io.to(sessionDetails.adviserTicketId).emit("sessionEnded", sessionDetails);
    io.to(sessionDetails.studentTicketId).emit("sessionEnded", sessionDetails);
  });

  socket.on("durationUpdated", (requestBody) => {
    console.log("Received duration update:", requestBody);
    // Broadcast the updated ticket data to both rooms:
    io.to(requestBody.data.adviserTicket._id).emit("durationUpdated", requestBody.data.adviserTicket);
    io.to(requestBody.data.adviserTicket.ReceiverTicketId).emit("durationUpdated", requestBody.data.studentTicket);
  });
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
