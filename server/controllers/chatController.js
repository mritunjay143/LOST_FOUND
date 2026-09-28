const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Item = require("../models/Item");
const Notification = require("../models/Notification");

// Get or Create Conversation for an Item between 2 Users
const getOrCreateConversation = async (req, res) => {
  try {
    const { itemId, recipientId } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Default recipient is the item's reportedBy if not explicitly provided
    const targetUserId = recipientId || item.reportedBy.toString();

    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: "You cannot start a chat with yourself" });
    }

    // Find existing conversation with exact participants and item
    let conversation = await Conversation.findOne({
      item: itemId,
      participants: { $all: [req.user.id, targetUserId] },
    })
      .populate("participants", "username email avatar role")
      .populate("item")
      .populate("lastMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, targetUserId],
        item: itemId,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "username email avatar role")
        .populate("item");
    }

    res.status(200).json({ conversation });
  } catch (error) {
    console.error("Get/Create Conversation Error:", error);
    res.status(500).json({ message: "Failed to initialize conversation" });
  }
};

// Get List of User Conversations
const getUserConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .populate("participants", "username email avatar role")
      .populate("item")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json({ conversations });
  } catch (error) {
    console.error("Get User Conversations Error:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

// Get Messages for a Conversation with Authorization Guard
const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Critical Authorization Check: User MUST be in participants or be an admin
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user.id
    );
    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. You are not a participant in this conversation." });
    }

    const messages = await Message.find({ conversation: req.params.conversationId })
      .populate("sender", "username email avatar")
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Failed to fetch chat messages" });
  }
};

// Send Message (HTTP API fallback)
const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;

    if (!conversationId || !text || !text.trim()) {
      return res.status(400).json({ message: "Conversation ID and non-empty text required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Authorization Check
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user.id
    );
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to message in this chat" });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      text: text.trim(),
    });

    await message.populate("sender", "username email avatar");

    conversation.lastMessage = message._id;
    await conversation.save();

    // Notify other participant
    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== req.user.id
    );
    if (otherParticipantId) {
      await Notification.create({
        recipient: otherParticipantId,
        sender: req.user.id,
        type: "NEW_MESSAGE",
        item: conversation.item,
        message: `New message from ${req.user.username}: "${text.substring(0, 30)}..."`,
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage,
};
