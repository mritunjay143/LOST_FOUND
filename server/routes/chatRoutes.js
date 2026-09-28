const express = require("express");
const router = express.Router();

const {
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

router.post("/conversation", protect, getOrCreateConversation);
router.get("/conversations", protect, getUserConversations);
router.get("/messages/:conversationId", protect, getMessages);
router.post("/message", protect, sendMessage);

module.exports = router;
