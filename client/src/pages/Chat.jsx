import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConvId = searchParams.get("conversationId");

  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!token) return;

    const socket = io("http://localhost:5000", {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket Connected:", socket.id);
    });

    socket.on("receive_message", (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    socket.on("error_message", (err) => {
      setError(err.message || "Socket error occurred");
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Fetch list of conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/chat/conversations");
      const list = res.data.conversations || [];
      setConversations(list);

      if (initialConvId) {
        const found = list.find((c) => c._id === initialConvId);
        if (found) {
          selectConversation(found);
        } else if (list.length > 0) {
          selectConversation(list[0]);
        }
      } else if (list.length > 0) {
        selectConversation(list[0]);
      }
    } catch (err) {
      console.error("Fetch conversations error:", err);
      setError("Failed to load chat conversations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const selectConversation = async (conv) => {
    setActiveConversation(conv);
    setError("");
    setSearchParams({ conversationId: conv._id });

    // Join Socket Room
    if (socketRef.current) {
      socketRef.current.emit("join_room", { conversationId: conv._id });
    }

    // Fetch messages for conversation
    try {
      setMsgLoading(true);
      const res = await api.get(`/chat/messages/${conv._id}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("Fetch messages error:", err);
      setError(err.response?.data?.message || "Failed to load chat history.");
    } finally {
      setMsgLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;

    const textToSend = messageText.trim();
    setMessageText("");

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("send_message", {
        conversationId: activeConversation._id,
        text: textToSend,
      });
    } else {
      // HTTP Fallback
      try {
        const res = await api.post("/chat/message", {
          conversationId: activeConversation._id,
          text: textToSend,
        });
        setMessages((prev) => [...prev, res.data.message]);
      } catch (err) {
        console.error("Send message HTTP error:", err);
        setError("Failed to send message.");
      }
    }
  };

  const getOtherParticipant = (conv) => {
    if (!conv || !conv.participants) return null;
    return conv.participants.find((p) => p._id !== user?.id) || conv.participants[0];
  };

  return (
    <div className="chat-page-container">
      <div className="chat-layout">
        {/* Sidebar Conversations List */}
        <aside className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3>💬 Conversations</h3>
          </div>

          {loading ? (
            <p style={{ padding: "16px" }}>Loading chats...</p>
          ) : conversations.length === 0 ? (
            <div className="empty-state-box" style={{ padding: "20px" }}>
              <p>No active chat conversations yet.</p>
              <p className="sub-text">
                Go to <a href="/search">Search</a>, open an item, and click "Start Secure Chat".
              </p>
            </div>
          ) : (
            <div className="conversations-list">
              {conversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                const isSelected = activeConversation?._id === conv._id;

                return (
                  <div
                    key={conv._id}
                    className={`conversation-item ${isSelected ? "active" : ""}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="avatar-circle">
                      {otherUser?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="conv-details">
                      <div className="conv-user-name">
                        {otherUser?.username || "Campus User"}
                      </div>
                      <div className="conv-item-title">
                        📦 {conv.item?.title || "Item Chat"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Main Chat Stream */}
        <main className="chat-main-stream">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-stream-header">
                <div className="chat-header-user">
                  <div className="avatar-circle">
                    {getOtherParticipant(activeConversation)?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <h4>{getOtherParticipant(activeConversation)?.username || "User"}</h4>
                    <span className="sub-text">
                      Item: <strong>{activeConversation.item?.title}</strong> ({activeConversation.item?.type})
                    </span>
                  </div>
                </div>

                {activeConversation.item && (
                  <a
                    href={`/items/${activeConversation.item._id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-table-view"
                  >
                    View Item
                  </a>
                )}
              </div>

              {error && <div className="alert-banner error">⚠️ {error}</div>}

              {/* Message Stream */}
              <div className="messages-stream-box">
                {msgLoading ? (
                  <div className="loading-box">
                    <div className="spinner"></div>
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-state-box">
                    <p>No messages in this chat yet. Send a greeting!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender?._id === user.id || msg.sender === user.id;

                    return (
                      <div
                        key={msg._id}
                        className={`message-bubble-row ${isOwn ? "own" : "other"}`}
                      >
                        <div className="message-bubble">
                          <span className="sender-name">
                            {isOwn ? "You" : msg.sender?.username || "User"}
                          </span>
                          <p className="message-text">{msg.text}</p>
                          <span className="message-timestamp">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                  type="text"
                  className="form-input chat-input"
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button type="submit" className="submit-btn send-btn">
                  Send ➔
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state-box" style={{ margin: "auto" }}>
              <h3>Select a conversation to start chatting</h3>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Chat;
