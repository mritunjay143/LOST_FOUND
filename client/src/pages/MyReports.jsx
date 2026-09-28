import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function MyReports() {
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [itemsRes, claimsRes] = await Promise.all([
        api.get("/items/my-items"),
        api.get("/claims/my-claims"),
      ]);

      setItems(itemsRes.data.items || []);
      setClaims(claimsRes.data.claims || []);
    } catch (err) {
      console.error("My Reports Fetch Error:", err);
      setError("Failed to load your reports and claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.delete(`/items/${itemId}`);
      fetchData();
    } catch (err) {
      console.error("Delete Error:", err);
      alert(err.response?.data?.message || "Failed to delete item");
    }
  };

  const handleMarkReturned = async (itemId) => {
    try {
      await api.put(`/claims/item/${itemId}/returned`);
      fetchData();
    } catch (err) {
      console.error("Returned Error:", err);
      alert(err.response?.data?.message || "Failed to update return status");
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "LOST") return item.type === "LOST";
    if (activeTab === "FOUND") return item.type === "FOUND";
    if (activeTab === "ACTIVE") return item.status === "ACTIVE";
    if (activeTab === "CLAIMED") return item.status === "CLAIMED";
    if (activeTab === "RETURNED") return item.status === "RETURNED";
    return true;
  });

  return (
    <div className="my-reports-container">
      <div className="my-reports-header">
        <div className="my-reports-title-box">
          <h2>📁 My Campus Reports & Claims</h2>
          <p>Manage your reported lost & found items, inspect ownership claims, or track your submitted claims.</p>
        </div>

        <div className="my-reports-actions">
          <Link to="/report-lost" className="btn-dash-action lost">
            + Report Lost Item
          </Link>
          <Link to="/report-found" className="btn-dash-action found">
            + Report Found Item
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {["ALL", "LOST", "FOUND", "ACTIVE", "CLAIMED", "RETURNED", "MY_CLAIMS"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "MY_CLAIMS" ? `Submitted Claims (${claims.length})` : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-box">
          <div className="spinner"></div>
          <span>Loading your records...</span>
        </div>
      ) : error ? (
        <div className="alert-banner error">{error}</div>
      ) : activeTab === "MY_CLAIMS" ? (
        /* Render Submitted Claims */
        <div className="my-claims-list">
          {claims.length === 0 ? (
            <div className="empty-state-box">
              <p>You haven't submitted any ownership claims for found items.</p>
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim._id} className="claim-card">
                <div className="claim-header">
                  <div>
                    <h4>Item: {claim.item?.title || "Found Item"}</h4>
                    <p>Finder: {claim.finder?.username} ({claim.finder?.email})</p>
                  </div>
                  <span className={`badge-status ${claim.status.toLowerCase()}`}>
                    Status: {claim.status}
                  </span>
                </div>

                {claim.item && (
                  <div className="claim-item-summary">
                    <span>📍 {claim.item.location}</span>
                    <span>📂 {claim.item.category}</span>
                    <span>📅 {new Date(claim.item.date).toLocaleDateString()}</span>
                  </div>
                )}

                {claim.status === "APPROVED" && (
                  <div className="alert-banner success" style={{ marginTop: "10px" }}>
                    🎉 Your claim was APPROVED! Contact the finder to retrieve your item.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Render Reported Items */
        <div className="reports-table-box">
          {filteredItems.length === 0 ? (
            <div className="empty-state-box">
              <p>No items found under tab "{activeTab}".</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item Title</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
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
                        <div className="table-action-btns">
                          <Link to={`/items/${item._id}`} className="btn-table-view">
                            View
                          </Link>
                          {item.status !== "RETURNED" && (
                            <button
                              onClick={() => handleMarkReturned(item._id)}
                              className="btn-table-returned"
                            >
                              Returned
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="btn-table-delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyReports;
