const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");

dotenv.config();

// Connect MongoDB
connectDB();

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const claimRoutes = require("./routes/claimRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const statsRoutes = require("./routes/statsRoutes");
const adminRoutes = require("./routes/adminRoutes");

const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const Notification = require("./models/Notification");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Serve local static upload directory fallback
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("🚀 LOST_FOUND_MCE API Backend is running smoothly!");
});

// Socket.IO Authentication & Real-Time Chat Security
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
  if (!token) {
    return next(new Error("Authentication error: Token required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mySuperSecretKey123");
    socket.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`⚡ Socket connected: ${socket.id} (User: ${socket.userId})`);

  // Join User's Personal Room for instant push notifications
  socket.join(`user_${socket.userId}`);

  // Join Specific Chat Room with Authorization Guard
  socket.on("join_room", async ({ conversationId }) => {
    try {
      if (!conversationId) return;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit("error_message", { message: "Conversation not found" });
        return;
      }

      // Verify user is a participant
      const isParticipant = conversation.participants.some(
        (p) => p.toString() === socket.userId
      );
      if (!isParticipant) {
        socket.emit("error_message", { message: "Unauthorized access to chat room" });
        return;
      }

      socket.join(conversationId);
      console.log(`User ${socket.userId} joined room ${conversationId}`);
    } catch (err) {
      console.error("Socket Join Room Error:", err);
    }
  });

  // Handle Real-Time Message Sending
  socket.on("send_message", async ({ conversationId, text }) => {
    try {
      if (!conversationId || !text || !text.trim()) return;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Security check
      const isParticipant = conversation.participants.some(
        (p) => p.toString() === socket.userId
      );
      if (!isParticipant) {
        socket.emit("error_message", { message: "Not authorized to send messages in this conversation" });
        return;
      }

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        text: text.trim(),
      });

      await message.populate("sender", "username email avatar");

      conversation.lastMessage = message._id;
      await conversation.save();

      // Emit to room
      io.to(conversationId).emit("receive_message", message);

      // Notify other participant
      const otherParticipantId = conversation.participants.find(
        (p) => p.toString() !== socket.userId
      );
      if (otherParticipantId) {
        const notif = await Notification.create({
          recipient: otherParticipantId,
          sender: socket.userId,
          type: "NEW_MESSAGE",
          item: conversation.item,
          message: `New message: "${text.substring(0, 30)}..."`,
        });

        io.to(`user_${otherParticipantId}`).emit("new_notification", notif);
      }
    } catch (err) {
      console.error("Socket Send Message Error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔥 Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});