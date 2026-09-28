import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Navbar() {
  const { user, logout, isAdmin, unreadCount, notifications, fetchNotifications } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleToggleNotif = async () => {
    setShowNotifMenu(!showNotifMenu);
    if (!showNotifMenu && unreadCount > 0) {
      try {
        await api.put("/notifications/read");
        fetchNotifications();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-brand-container">
        <Link to={user ? "/dashboard" : "/"} className="nav-brand">
          <div className="brand-logo">🔍</div>
          <div className="brand-text">
            <span className="brand-title">CAMPUS LOST & FOUND</span>
            <span className="brand-sub">MCE MOTIHARI PORTAL</span>
          </div>
        </Link>
      </div>

      <div className="nav-links">
        <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
          🏠 Home
        </Link>

        <Link to="/search" className={`nav-link ${isActive("/search") ? "active" : ""}`}>
          🔎 Search Items
        </Link>

        {user ? (
          <>
            <Link
              to="/dashboard"
              className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
            >
              📊 Dashboard
            </Link>

            <Link
              to="/report-lost"
              className={`nav-link report-lost-link ${isActive("/report-lost") ? "active" : ""}`}
            >
              🔴 Report Lost
            </Link>

            <Link
              to="/report-found"
              className={`nav-link report-found-link ${isActive("/report-found") ? "active" : ""}`}
            >
              🟢 Report Found
            </Link>

            <Link
              to="/my-reports"
              className={`nav-link ${isActive("/my-reports") ? "active" : ""}`}
            >
              📁 My Reports
            </Link>

            <Link
              to="/chat"
              className={`nav-link ${isActive("/chat") ? "active" : ""}`}
            >
              💬 Chat
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`nav-link admin-badge-link ${isActive("/admin") ? "active" : ""}`}
              >
                👑 Admin
              </Link>
            )}

            {/* Notification Bell */}
            <div className="notif-wrapper">
              <button
                className="notif-bell-btn"
                onClick={handleToggleNotif}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {showNotifMenu && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span>Notifications</span>
                    <button onClick={() => setShowNotifMenu(false)}>✕</button>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <p className="notif-empty">No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`notif-item ${!n.read ? "unread" : ""}`}
                        >
                          <p>{n.message}</p>
                          <span className="notif-time">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/profile"
              className={`user-profile-chip ${isActive("/profile") ? "active" : ""}`}
            >
              <div className="avatar-circle">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="username-text">{user.username}</span>
            </Link>

            <button onClick={handleLogout} className="logout-btn">
              Logout ➔
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={`nav-link ${isActive("/login") ? "active" : ""}`}
            >
              Sign In
            </Link>

            <Link to="/signup" className="nav-btn-primary">
              Create Account
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
