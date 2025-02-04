const express = require("express");
const { studentUser, adviserUser, adminUser } = require("../models/userModels");
const { route } = require("./auth");
const axios = require("axios");
const { log } = require("console");

const createRouter = (io) => {
  const router = express.Router();
  router.post("/chatbot", async (req, res) => {
    try {
      const { query } = req.body;

      // Forward the request to the Flask server
      const flaskResponse = await axios.post(
        "http://127.0.0.1:5000/api/chatbot", // Flask server address
        { query } // Pass the user message to Flask
      );
      console.log("FLASK RESonpe ", flaskResponse);

      // Send the Flask response back to the client
      res.json(flaskResponse.data);
    } catch (error) {
      console.error("Error communicating with Flask server:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  // Route to fetch user details based on storedId
  router.get("/", (req, res) => {
    res.send("welcome");
  });
  router.get("/user/:storedId", async (req, res) => {
    const { storedId } = req.params;
    const { userType } = req.query;

    if (!storedId || !userType) {
      return res
        .status(400)
        .json({ message: "Bad request: Missing parameters" });
    }

    try {
      const userModel = userType === "student" ? studentUser : adviserUser;
      const user = await userModel.findById(storedId).lean();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.tickets.sort(
        (a, b) => new Date(b.timeStamp) - new Date(a.timeStamp)
      );
      res.status(200).json(user);
    } catch (error) {
      console.error("Error fetching user: ", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Route to get all messages of a specific ticket
  router.get("/messages/:ticketId", async (req, res) => {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({ message: "Bad request: Missing ticketId" });
    }

    try {
      const user =
        (await studentUser.findOne({ "tickets._id": ticketId })) ||
        (await adviserUser.findOne({ "tickets._id": ticketId }));

      if (!user) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const ticket = user.tickets.id(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.status(200).json(ticket.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
// In your notifications route file (inside createRouter)
router.put("/notifications", async (req, res) => {
  const { receiverId, receiverType, message } = req.body;

  try {
    const Model = receiverType === "student" ? studentUser : adviserUser;
    const updatedUser = await Model.findByIdAndUpdate(
      receiverId,
      {
        $push: { "notifications.message": message },
        $inc: { "notifications.newNotifications": 1 },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(
      `Notification added to ${updatedUser.username}:`,
      updatedUser.notifications.message,
      "New notifications:",
      updatedUser.notifications.newNotifications
    );

    // Emit the update to the recipient's room (receiverId)
    io.to(receiverId).emit("notificationUpdated", updatedUser.notifications);

    res.status(200).json(updatedUser.notifications);
  } catch (error) {
    console.error("Error updating notifications:", error);
    res.status(500).json({ error: "Server error" });
  }
});


  router.put("/reset-notifications", async (req, res) => {
    const { receiverId, receiverType } = req.body;
  
    try {
      const Model = receiverType === "student" ? studentUser : adviserUser;
  
      const updatedUser = await Model.findByIdAndUpdate(
        receiverId,
        { $set: { "notifications.newNotifications": 0 } },
        { new: true } 
      );
  
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.status(200).json({ message: "New notifications reset to 0" });
    } catch (error) {
      console.error("Error resetting notifications:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
  router.post("/messages/:ticketId", async (req, res) => {
    const { ticketId } = req.params;
    const { sender, senderName, content, ReceiverTicketId } = req.body;
    const time = new Date();

    if (!ticketId || !sender || !senderName || !content || !ReceiverTicketId) {
      return res
        .status(400)
        .json({ message: "Bad request: Missing parameters" });
    }

    try {
      const [student, adviser] = await Promise.all([
        sender === "student"
          ? studentUser.findOne({ "tickets._id": ticketId })
          : adviserUser.findOne({ "tickets._id": ticketId }),
        sender === "student"
          ? adviserUser.findOne({ "tickets._id": ReceiverTicketId })
          : studentUser.findOne({ "tickets._id": ReceiverTicketId }),
      ]);

      if (!student || !adviser) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const studentTicket = student.tickets.id(ticketId);
      const adviserTicket = adviser.tickets.id(ReceiverTicketId);
      const message = { sender, senderName, content, timeStamp: time };

      adviserTicket.messages.push(message);
      studentTicket.messages.push(message);

      await Promise.all([student.save(), adviser.save()]);
      res.status(200).json(adviserTicket.messages);
    } catch (error) {
      console.error("Error posting message:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Route to create a new ticket
  router.put("/user/createTicket", async (req, res) => {
    const {
      studentId,
      adviserId,
      title,
      timeStamp,
      date,
      studentName,
      adviserName,
      storedId,
      selectedHour,
      selectedMinute,
      course,
    } = req.body;

    if (
      !studentId ||
      !adviserId ||
      !title ||
      !timeStamp ||
      !date ||
      !studentName ||
      !adviserName ||
      !storedId
    ) {
      return res
        .status(400)
        .json({ message: "Bad request: Missing parameters!" });
    }

   
 
    try {
      const [student, adviser] = await Promise.all([
        studentUser.findOneAndUpdate(
          { _id: studentId },
          {
            $push: {
              tickets: {
                name: adviserName,
                title,
                timeStamp,
                date,
                ReceiverId: adviserId,
                Hour: selectedHour,
                Minutes: selectedMinute,
                confirmedDuration: false,
                course,
              },
            },
          },
          { new: true }
        ),
        adviserUser.findOneAndUpdate(
          { _id: adviserId },
          {
            $push: {
              tickets: {
                name: studentName,
                title,
                timeStamp,
                date,
                ReceiverId: studentId,
                Hour: selectedHour,
                Minutes: selectedMinute,
                confirmedDuration: false,
                course,
              },
            },
          },
          { new: true }
        ),
      ]);
      if (!student || !adviser) {
        return res.status(404).json({ message: "User not found" });
      }
      console.log(adviserUser);

      const studentTicketId = student.tickets[student.tickets.length - 1]._id;
      const adviserTicketId = adviser.tickets[adviser.tickets.length - 1]._id;

      student.tickets[student.tickets.length - 1].ReceiverTicketId =
        adviserTicketId;
      adviser.tickets[adviser.tickets.length - 1].ReceiverTicketId =
        studentTicketId;

      await Promise.all([student.save(), adviser.save()]);


      // res.status(200).json({ student, adviser });
      res.status(200).json({
        studentTicket: student.tickets[student.tickets.length - 1],
        adviserTicket: adviser.tickets[adviser.tickets.length - 1],
      });
    } catch (error) {
      console.error("Error creating ticket: ", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Route to fetch all advisers
  router.get("/advisersData", async (req, res) => {
    try {
      const advisers = await adviserUser.find({});
      res.status(200).json(advisers);
    } catch (error) {
      console.error("Error fetching advisers data: ", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  router.get("/studentsData", async (req, res) => {
    try {
      const students = await studentUser.find({});
      console.log("STUDENTS DATA ! Done ", students);

      res.status(200).json(students);
    } catch (error) {
      console.error("Error fetching students data: ", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Route to get available hours
  router.get("/getHours", async (req, res) => {
    try {
      const timeData = await adviserUser.findOne({});
      if (!timeData) {
        return res.status(404).json({ message: "No time data found" });
      }
      // console.log("time data ", timeData);

      res.status(200).json(timeData);
    } catch (error) {
      console.error("Error fetching time data: ", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Route to update the expected duration of a ticket
  router.put("/user/confirmDuration", async (req, res) => {
    const requestBody = req.body;
    console.log("req body in update time: ", requestBody);
    
    if (
      !requestBody.studentId ||
      !requestBody.adviserId ||
      !requestBody.ticketId ||
      !requestBody.newDuration ||
      !requestBody.selectedHour ||
      !requestBody.selectedMinute
    ) {
      return res
        .status(400)
        .json({ message: "Bad request: Missing parameters" });
    }

    try {
      const [student, adviser] = await Promise.all([
        studentUser.findOne({
          _id: requestBody.studentId,
          "tickets._id": requestBody.ReceiverTicketId,
        }),
        adviserUser.findOne({
          _id: requestBody.adviserId,
          "tickets._id": requestBody.ticketId,
        }),
      ]);

      if (!student || !adviser) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const studentTicket = student.tickets.id(requestBody.ReceiverTicketId);
      const adviserTicket = adviser.tickets.id(requestBody.ticketId);

      studentTicket.confirmedDuration = true;

      adviserTicket.confirmedDuration = true;
      // console.log("REQ : ", requestBody);
      console.log("req body : ", requestBody);
      
    adviser.bookedAppointments.push({
      date: requestBody.ticketDate, 
      start: requestBody.selectedHour, 
      end: requestBody.endHour,                              
      student: ""                        
    });
      await Promise.all([student.save(), adviser.save()]);

      res.status(200).json({ studentTicket, adviserTicket, adviser });
    } catch (error) {
      console.error("Error updating expected duration: ", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.put("/user/updateTime", async (req, res) => {
    const { startTime, duration, adviserTicketId, studentTicketId ,ticketDate,endHour} = req.body;
  
    if (!startTime || !duration || !adviserTicketId || !studentTicketId) {
      return res.status(400).json({ message: "Missing parameters" });
    }
  
    try {
      const adviser = await adviserUser.findOne({ "tickets._id": adviserTicketId });
      const student = await studentUser.findOne({ "tickets._id": studentTicketId });
  
      if (!adviser || !student) {
        return res.status(404).json({ message: "Ticket not found" });
      }
  
      const adviserTicket = adviser.tickets.id(adviserTicketId);
      const studentTicket = student.tickets.id(studentTicketId);
  
      if (!adviserTicket || !studentTicket) {
        return res.status(404).json({ message: "Ticket not found in one or both users" });
      }
  
      adviserTicket.Hour = startTime;
      adviserTicket.Minutes = duration;
      adviserTicket.confirmedDuration = true;
  
      studentTicket.Hour = startTime;
      studentTicket.Minutes = duration;
      studentTicket.confirmedDuration = true;
      adviser.bookedAppointments.push({
        date: ticketDate, 
        start: startTime, 
        end: endHour,                              
        student: ""                        
      });
      await Promise.all([adviser.save(), student.save()]);
  
      io.to(adviserTicketId).emit("durationUpdated", adviserTicket);
      io.to(studentTicketId).emit("durationUpdated", studentTicket);
  
      res.status(200).json({ adviserTicket, studentTicket });
    } catch (error) {
      console.error("Error updating time:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
router.post("/user/officeHours", async (req, res) => {
    const { storedId, daysAndTimes } = req.body;
    console.log("days and times : ", daysAndTimes);

    if (!storedId || !daysAndTimes || !Array.isArray(daysAndTimes)) {
      return res.status(400).json({
        message: "Bad request: Missing or invalid parameters",
      });
    }

    try {
      const adviser = await adviserUser.findOne({ _id: storedId });
      if (!adviser) {
        return res.status(404).json({ message: "Adviser not found" });
      }
      console.log(daysAndTimes);

      const processedDays = daysAndTimes.map((day) => {
        console.log("day : ", day);

        if (!day || !day.day) {
          throw new Error(
            "Each day object must contain a 'day' field and an array of 'hours'."
          );
        }

        const hoursArray = Array.isArray(day.hours) ? day.hours : [day.hours];

        return {
          ...day,
          hours: hoursArray.map((hour) => {
            if (!hour.start || !hour.end) {
              throw new Error(
                "Each hour must contain 'start' and 'end' fields."
              );
            }
            return {
              start: hour.start,
              end: hour.end,
              minutes: hour.minutes || [], 
            };
          }),
        };
      });

      adviser.availableTimes = { Days: processedDays };

      await adviser.save();

      res.status(200).json({
        message: "Office hours updated successfully",
        availableTimes: adviser.availableTimes,
      });
    } catch (error) {
      console.error("Error updating office hours:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });


  router.put("/user/endSession", async (req, res) => {
    const {
      adviserId,
      studentId,
      ticketId,
      ReceiverTicketId,
      conclusion,
      accepted,
    } = req.body;
    try {
      const [student, adviser] = await Promise.all([
        studentUser.findOne({
          _id: studentId,
          "tickets._id": ReceiverTicketId,
        }),
        adviserUser.findOne({
          _id: adviserId,
          "tickets._id": ticketId,
        }),
      ]);
      if (!student || !adviser) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const studentTicket = student.tickets.id(ReceiverTicketId);
      const adviserTicket = adviser.tickets.id(ticketId);
      studentTicket.conclusion = conclusion;
      adviserTicket.conclusion = conclusion;
      studentTicket.accepted = accepted;
      adviserTicket.accepted = accepted;
      await Promise.all([student.save(), adviser.save()]);

      res.status(200).json({ conclusion, accepted });
    } catch (error) {
      console.log("Error ending session : ", error);
    }
  });
  router.post("/user/accept", async (req, res) => {
    const { adviserId, studentId, ticketId, ReceiverTicketId } = req.body;
    try {
      const [student, adviser] = await Promise.all([
        studentUser.findOne({
          _id: studentId,
          "tickets._id": ReceiverTicketId,
        }),
        adviserUser.findOne({
          _id: adviserId,
          "tickets._id": ticketId,
        }),
      ]);
      if (!student || !adviser) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const studentTicket = student.tickets.id(ReceiverTicketId);
      const adviserTicket = adviser.tickets.id(ticketId);
      studentTicket.accepted = true;
      adviserTicket.accepted = true;
      await Promise.all([student.save(), adviser.save()]);
      res.status(200).json(adviserTicket.accepted);
    } catch (error) {
      console.log("Error Accepting session : ", error);
    }
  });
  router.put("/user/supervisor", async (req, res) => {
    try {
      const assignedSupervisors = req.body;
      console.log("? ", assignedSupervisors);

      // Validate input
      if (!assignedSupervisors || !Array.isArray(assignedSupervisors)) {
        return res.status(400).json({ message: "Invalid input format." });
      }

      // Update each supervisor and student
      for (const { adviser, students } of assignedSupervisors) {
        // Update adviser record
        const adviserRecord = await adviserUser.findOne({ username: adviser });
        if (!adviserRecord) {
          return res
            .status(404)
            .json({ message: `Adviser ${adviser} not found.` });
        }

        // Add students to adviser
        adviserRecord.students = [
          ...new Set([...adviserRecord.students, ...students]),
        ];
        await adviserRecord.save();

        // Update each student record
        for (const student of students) {
          const studentRecord = await studentUser.findOne({
            username: student,
          });
          if (!studentRecord) {
            return res
              .status(404)
              .json({ message: `Student ${student} not found.` });
          }

          studentRecord.supervisor = adviser;
          await studentRecord.save();
        }
      }

      // Update Admin record
      const adminRecord = await adminUser.findOne();
      console.log("admin : ", adminRecord);

      if (adminRecord) {
        adminRecord.assignedSupervisors = assignedSupervisors;
        adminRecord.freeStudents = adminRecord.freeStudents.filter(
          (student) =>
            !assignedSupervisors.some((entry) =>
              entry.students.includes(student)
            )
        );
        adminRecord.freeSupervisors = adminRecord.freeSupervisors.filter(
          (supervisor) =>
            !assignedSupervisors.some((entry) => entry.adviser === supervisor)
        );
        await adminRecord.save();
      }

      res.status(200).json({ message: "Supervisors assigned successfully." });
    } catch (error) {
      console.error("Error assigning supervisors:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });
  router.get("/user/free", async (req, res) => {
    try {
      const adminRecord = await adminUser.findOne();
      if (!adminRecord) {
        return res.status(404).json({ message: "Admin record not found." });
      }

      res.status(200).json({
        freeStudents: adminRecord.freeStudents,
        freeSupervisors: adminRecord.freeSupervisors,
      });
    } catch (error) {
      console.error("Error fetching free lists:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });

  return router;
};

module.exports = createRouter;
