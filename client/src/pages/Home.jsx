import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function Home() {
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, itemsRes] = await Promise.all([
          api.get("/stats"),
          api.get("/items?limit=6"),
        ]);
        setStats(statsRes.data.stats);
        setRecentItems(itemsRes.data.items || []);
      } catch (err) {
        console.error("Home Data Fetch Error:", err);
        setError("Failed to load campus statistics & items.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">MOTIHARI COLLEGE OF ENGINEERING,MOTIHARI</span>
          <h1 className="hero-title">
            College Campus <span className="highlight-text">Lost & Found</span> System
          </h1>
          <p className="hero-subtitle">
            Report lost items, upload found belongings, match descriptions, verify ownership securely, and reunite campus members with their possessions.
          </p>

          <div className="hero-actions">
            <Link to="/report-lost" className="btn-hero-lost">
              🔴 Report Lost Item
            </Link>
            <Link to="/report-found" className="btn-hero-found">
              🟢 Report Found Item
            </Link>
            <Link to="/search" className="btn-hero-secondary">
              🔍 Search Items
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Dynamic Live Statistics */}
      <section className="stats-section">
        <h2 className="section-title">📊 Live Campus Recovery Statistics</h2>
        <p className="section-subtitle">Real-time statistics dynamically updated from MongoDB database.</p>

        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <span>Loading statistics...</span>
          </div>
        ) : error ? (
          <div className="alert-banner error">{error}</div>
        ) : (
          <div className="home-stats-grid">
            <div className="home-stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-number">{stats?.totalReports || 0}</div>
              <div className="stat-name">Total Items Reported</div>
            </div>

            <div className="home-stat-card lost">
              <div className="stat-icon">🔍</div>
              <div className="stat-number">{stats?.totalLost || 0}</div>
              <div className="stat-name">Lost Reports</div>
            </div>

            <div className="home-stat-card found">
              <div className="stat-icon">💡</div>
              <div className="stat-number">{stats?.totalFound || 0}</div>
              <div className="stat-name">Found Items</div>
            </div>

            <div className="home-stat-card returned">
              <div className="stat-icon">🎉</div>
              <div className="stat-number">{stats?.totalReturned || 0}</div>
              <div className="stat-name">Successfully Returned</div>
            </div>

            <div className="home-stat-card missing">
              <div className="stat-icon">⏳</div>
              <div className="stat-number">{stats?.stillMissing || 0}</div>
              <div className="stat-name">Still Missing</div>
            </div>

            <div className="home-stat-card rate">
              <div className="stat-icon">📈</div>
              <div className="stat-number">{stats?.returnRate || 0}%</div>
              <div className="stat-name">Recovery Rate</div>
            </div>
          </div>
        )}
      </section>

      {/* How it Works Workflow */}
      <section className="workflow-section">
        <h2 className="section-title">🔄 How Campus Recovery Works</h2>
        <div className="workflow-grid">
          <div className="workflow-card">
            <div className="step-badge">STEP 1</div>
            <h3>Report Item</h3>
            <p>Fill out details including category, location, color, brand, and upload images.</p>
          </div>

          <div className="workflow-card">
            <div className="step-badge">STEP 2</div>
            <h3>Smart Match</h3>
            <p>Our algorithm scans lost & found reports to calculate candidate match scores (e.g. 85%).</p>
          </div>

          <div className="workflow-card">
            <div className="step-badge">STEP 3</div>
            <h3>Verify Ownership</h3>
            <p>Claimants answer non-public verification questions set by the finder for security.</p>
          </div>

          <div className="workflow-card">
            <div className="step-badge">STEP 4</div>
            <h3>Reunite & Return</h3>
            <p>Chat in real-time, arrange pickup, and mark the item officially as RETURNED!</p>
          </div>
        </div>
      </section>

      {/* Recent Items Grid */}
      <section className="recent-items-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">📦 Recent Campus Reports</h2>
            <p className="section-subtitle">Browse recently reported lost and found items on campus.</p>
          </div>
          <Link to="/search" className="link-view-all">
            View All Reports ➔
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="empty-state-box">
            <p>No items reported yet. Be the first to report a lost or found item!</p>
          </div>
        ) : (
          <div className="items-grid">
            {recentItems.map((item) => (
              <div key={item._id} className="item-card">
                <div className="item-card-header">
                  <span className={`badge-type ${item.type.toLowerCase()}`}>
                    {item.type === "LOST" ? "🔴 LOST" : "🟢 FOUND"}
                  </span>
                  <span className={`badge-status ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>

                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="item-card-image"
                  />
                ) : (
                  <div className="item-image-placeholder">
                    <span>📷 No Image</span>
                  </div>
                )}

                <div className="item-card-body">
                  <h3 className="item-title">{item.title}</h3>
                  <p className="item-description">
                    {item.description.length > 80
                      ? `${item.description.substring(0, 80)}...`
                      : item.description}
                  </p>

                  <div className="item-meta">
                    <span>📂 {item.category}</span>
                    <span>📍 {item.location}</span>
                    <span>📅 {new Date(item.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="item-card-footer">
                  <Link to={`/items/${item._id}`} className="btn-view-details">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;