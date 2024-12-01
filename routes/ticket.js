const express = require("express");
const { studentUser, adviserUser } = require("../models/userModels");

const createRouter = () => {
  const router = express.Router();

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

  // Route to post new messages to a ticket
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
      expectedDuration,
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
                Duration: expectedDuration,
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
                Duration: expectedDuration,
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
  router.put("/user/expectedDuration", async (req, res) => {
    const requestBody = req.body;

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

      studentTicket.Duration = requestBody.newDuration;
      studentTicket.confirmedDuration = true;

      adviserTicket.Duration = requestBody.newDuration;
      adviserTicket.confirmedDuration = true;

      // console.log("REQ : ", requestBody);
      console.log("adivsre : ", adviser);

      let hour = Number(requestBody.selectedHour);
      let minute = Number(requestBody.selectedMinute);
      let duration = Number(requestBody.newDuration);
      console.log("req body : ", requestBody);

      const timeDocument = adviser.availableTimes;

      while (duration > 0) {
        // Calculate minutes to add in this hour
        const minutesToAdd = Math.min(60 - minute, duration);

        for (let i = 0; i < minutesToAdd; i++) {
          const minuteStr = (minute + i).toString().padStart(2, "0");

          if (hour === 10) {
            // Check if the minute already exists in timeDocument.ten
            const minuteExists = timeDocument.ten.some(
              (entry) => entry === minuteStr
            );
            if (!minuteExists) {
              timeDocument.ten.push(minuteStr);
            }
          } else if (hour === 11) {
            // Check if the minute already exists in timeDocument.eleven
            const minuteExists = timeDocument.eleven.some(
              (entry) => entry === minuteStr
            );
            if (!minuteExists) {
              timeDocument.eleven.push(minuteStr);
            }
          }
        }

        // Reduce the duration by the number of minutes we've added
        duration -= minutesToAdd;

        // Move to the next hour if necessary
        hour += 1;
        minute = 0; // Reset minute to 0 at the start of a new hour
      }
      adviser.availableTimes = timeDocument;

      await Promise.all([student.save(), adviser.save()]);
      console.log("time doc : ", timeDocument);

      res.status(200).json({ studentTicket, adviserTicket, adviser });
    } catch (error) {
      console.error("Error updating expected duration: ", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  router.post("/user/officeHours", async (req, res) => {
    const { storedId, daysAndTimes } = req.body;

    // Validate input: Ensure storedId is provided and daysAndTimes is a valid array
    if (!storedId || !daysAndTimes || !Array.isArray(daysAndTimes)) {
      return res.status(400).json({
        message: "Bad request: Missing or invalid parameters",
      });
    }

    try {
      // Fetch the adviser by ID
      const adviser = await adviserUser.findOne({ _id: storedId });
      if (!adviser) {
        return res.status(404).json({ message: "Adviser not found" });
      }
      console.log(daysAndTimes);

      // Ensure each day object has the required structure before processing
      const processedDays = daysAndTimes.map((day) => {
        console.log("day : ", day);

        if (!day || !day.day) {
          throw new Error(
            "Each day object must contain a 'day' field and an array of 'hours'."
          );
        }

        const hoursArray = Array.isArray(day.hours) ? day.hours : [day.hours]; // Convert to array if it's an object

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
              minutes: hour.minutes || [], // Ensure minutes is an array (default to empty)
            };
          }),
        };
      });

      // Update the adviser's office hours (availableTimes field)
      adviser.availableTimes = { Days: processedDays };

      // Save changes to the database
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
    const { adviserId, studentId, ticketId, ReceiverTicketId, conclusion } =
      req.body;
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
      await Promise.all([student.save(), adviser.save()]);

      res.status(200).json(conclusion);
    } catch (error) {
      console.log("Error ending session : ", error);
    }
  });
  return router;
};

module.exports = createRouter;
