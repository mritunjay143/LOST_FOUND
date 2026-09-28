import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Dashboard() {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState({
    total: 0,
    lost: 0,
    found: 0,
    active: 0,
    claimed: 0,
    returned: 0,
  });
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/items/my-items");
        const items = res.data.items || [];
        setRecentItems(items.slice(0, 5));

        const lost = items.filter((i) => i.type === "LOST").length;
        const found = items.filter((i) => i.type === "FOUND").length;
        const active = items.filter((i) => i.status === "ACTIVE").length;
        const claimed = items.filter((i) => i.status === "CLAIMED").length;
        const returned = items.filter((i) => i.status === "RETURNED").length;

        setUserStats({
          total: items.length,
          lost,
          found,
          active,
          claimed,
          returned,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-container">
      {/* Header Banner */}
      <div className="dashboard-header">
        <div className="user-welcome">
          <h2>Welcome back, {user?.username || "User"}! 👋</h2>
          <p>
            Role: <strong className={`role-tag ${user?.role || "student"}`}>{user?.role?.toUpperCase() || "STUDENT"}</strong>
            <span className="user-email-divider">•</span> Email: <span>{user?.email}</span>
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/report-lost" className="btn-dash-action lost">
            + Report Lost
          </Link>
          <Link to="/report-found" className="btn-dash-action found">
            + Report Found
          </Link>
        </div>
      </div>

      {/* User Reports Stats Grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-header">
            <span className="stat-icon">📊</span>
            <span className="stat-label">Total Reports</span>
          </div>
          <div className="stat-value">{userStats.total}</div>
        </div>

        <div className="stat-box lost">
          <div className="stat-header">
            <span className="stat-icon">🚨</span>
            <span className="stat-label">Lost Items</span>
          </div>
          <div className="stat-value">{userStats.lost}</div>
        </div>

        <div className="stat-box found">
          <div className="stat-header">
            <span className="stat-icon">🎁</span>
            <span className="stat-label">Found Items</span>
          </div>
          <div className="stat-value">{userStats.found}</div>
        </div>

        <div className="stat-box active">
          <div className="stat-header">
            <span className="stat-icon">⚡</span>
            <span className="stat-label">Active Listings</span>
          </div>
          <div className="stat-value">{userStats.active}</div>
        </div>

        <div className="stat-box claimed">
          <div className="stat-header">
            <span className="stat-icon">🔐</span>
            <span className="stat-label">Claimed Items</span>
          </div>
          <div className="stat-value">{userStats.claimed}</div>
        </div>

        <div className="stat-box returned">
          <div className="stat-header">
            <span className="stat-icon">🎉</span>
            <span className="stat-label">Returned Items</span>
          </div>
          <div className="stat-value">{userStats.returned}</div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="quick-actions-section">
        <h3>⚡ Quick Actions & Modules</h3>
        <div className="quick-grid">
          <Link to="/search" className="quick-card">
            <span className="quick-icon">🔍</span>
            <h4>Search Database</h4>
            <p>Filter & search lost/found items</p>
          </Link>

          <Link to="/my-reports" className="quick-card">
            <span className="quick-icon">📁</span>
            <h4>My Reports</h4>
            <p>Manage, edit & verify claims</p>
          </Link>

          <Link to="/chat" className="quick-card">
            <span className="quick-icon">💬</span>
            <h4>Real-Time Chat</h4>
            <p>Talk with item finders or owners</p>
          </Link>

          <Link to="/profile" className="quick-card">
            <span className="quick-icon">👤</span>
            <h4>My Profile</h4>
            <p>Update phone & department</p>
          </Link>
        </div>
      </div>

      {/* Recent My Items List */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>📋 Your Recent Reports</h3>
          <Link to="/my-reports" className="link-view-all">
            View All ➔
          </Link>
        </div>

        {loading ? (
          <p>Loading your reports...</p>
        ) : recentItems.length === 0 ? (
          <div className="empty-state-box">
            <p>You haven't reported any lost or found items yet.</p>
            <div style={{ marginTop: "12px" }}>
              <Link to="/report-lost" className="btn-dash-action lost" style={{ marginRight: "10px" }}>
                Report Lost Item
              </Link>
              <Link to="/report-found" className="btn-dash-action found">
                Report Found Item
              </Link>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentItems.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.title}</strong>
                    </td>
                    <td>
                      <span className={`badge-type ${item.type.toLowerCase()}`}>
                        {item.type}
                      </span>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.location}</td>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge-status ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <Link to={`/items/${item._id}`} className="btn-table-view">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
