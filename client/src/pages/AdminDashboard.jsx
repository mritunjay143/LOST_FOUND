import React, { useEffect, useState } from "react";
import api from "../api/axios";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("USERS");
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("Electronics");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editColor, setEditColor] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersRes, itemsRes, claimsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/items"),
        api.get("/admin/claims"),
      ]);

      setUsers(usersRes.data.users || []);
      setItems(itemsRes.data.items || []);
      setClaims(claimsRes.data.claims || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      setError(err.response?.data?.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "student" : "admin";
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setActionMsg(`User role updated to ${newRole.toUpperCase()}`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update user role");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user and all their reports?")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setActionMsg("User account deleted.");
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  const handleOpenEditItemModal = (item) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditLocation(item.location);
    setEditStatus(item.status);
    setEditColor(item.color || "");
    setEditBrand(item.brand || "");
    setEditDescription(item.description || "");
  };

  const handleSaveItemEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    setEditLoading(true);
    try {
      await api.put(`/admin/items/${editingItem._id}`, {
        title: editTitle,
        category: editCategory,
        location: editLocation,
        status: editStatus,
        color: editColor,
        brand: editBrand,
        description: editDescription,
      });

      setActionMsg(`Item "${editTitle}" updated successfully by Admin.`);
      setEditingItem(null);
      fetchAdminData();
    } catch (err) {
      console.error("Admin edit item error:", err);
      alert(err.response?.data?.message || "Failed to update item");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteItemAdmin = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item report?")) return;
    try {
      await api.delete(`/admin/items/${itemId}`);
      setActionMsg("Item report deleted by Admin.");
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete item report");
    }
  };

  const handleVerifyClaimAdmin = async (claimId, newStatus) => {
    try {
      await api.put(`/admin/claims/${claimId}/verify`, {
        status: newStatus,
        finderNotes: "Resolved by Administrator",
      });
      setActionMsg(`Claim updated to ${newStatus} by Admin.`);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to resolve claim");
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>👑 Administrator Control Panel</h2>
        <p>Full platform management: modify items, resolve dispute claims, and assign user roles.</p>

        <div className="admin-stats-summary">
          <div className="admin-stat-chip">
            <span>Total Registered Users</span>
            <strong>{users.length}</strong>
          </div>
          <div className="admin-stat-chip">
            <span>Total Platform Items</span>
            <strong>{items.length}</strong>
          </div>
          <div className="admin-stat-chip">
            <span>Total Claim Submissions</span>
            <strong>{claims.length}</strong>
          </div>
        </div>
      </div>

      {actionMsg && <div className="alert-banner success">✅ {actionMsg}</div>}
      {error && <div className="alert-banner error">⚠️ {error}</div>}

      {/* Admin Navigation Tabs */}
      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === "USERS" ? "active" : ""}`}
          onClick={() => setActiveTab("USERS")}
        >
          User Accounts ({users.length})
        </button>

        <button
          className={`tab-btn ${activeTab === "ITEMS" ? "active" : ""}`}
          onClick={() => setActiveTab("ITEMS")}
        >
          Item Reports & Manipulation ({items.length})
        </button>

        <button
          className={`tab-btn ${activeTab === "CLAIMS" ? "active" : ""}`}
          onClick={() => setActiveTab("CLAIMS")}
        >
          Claims & Dispute Resolution ({claims.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-box">
          <div className="spinner"></div>
          <span>Loading administrator portal data...</span>
        </div>
      ) : activeTab === "USERS" ? (
        /* Users Management Table */
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Student ID</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <strong>{u.username}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-tag ${u.role}`}>{u.role?.toUpperCase()}</span>
                  </td>
                  <td>{u.department || "N/A"}</td>
                  <td>{u.studentId || "N/A"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        onClick={() => handleToggleRole(u._id, u.role)}
                        className="btn-table-view"
                      >
                        Set {u.role === "admin" ? "Student" : "Admin"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u._id)}
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
      ) : activeTab === "ITEMS" ? (
        /* Items Moderation & Manipulation Table */
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Reporter</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
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
                  <td>{item.reportedBy?.username || "Unknown"}</td>
                  <td>{item.location}</td>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge-status ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        onClick={() => handleOpenEditItemModal(item)}
                        className="btn-table-view"
                      >
                        ✏️ Edit / Manipulate
                      </button>
                      <button
                        onClick={() => handleDeleteItemAdmin(item._id)}
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
      ) : (
        /* Claims Dispute Review Tab */
        <div className="claims-list">
          {claims.length === 0 ? (
            <div className="empty-state-box">
              <p>No claims submitted across the platform yet.</p>
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim._id} className="claim-card">
                <div className="claim-header">
                  <div>
                    <h4>Item: {claim.item?.title || "Item"}</h4>
                    <p>
                      Claimant: <strong>{claim.claimant?.username}</strong> ({claim.claimant?.email}) | Finder: <strong>{claim.finder?.username}</strong>
                    </p>
                  </div>
                  <span className={`badge-status ${claim.status.toLowerCase()}`}>
                    Status: {claim.status}
                  </span>
                </div>

                <div className="claim-answers">
                  <h5>Verification Answers:</h5>
                  {claim.verificationAnswers?.map((ans, idx) => (
                    <div key={idx} className="ans-row">
                      <strong>Q: {ans.question}</strong>
                      <p>A: {ans.answer}</p>
                    </div>
                  ))}
                </div>

                {claim.proofDetails && (
                  <p className="proof-text" style={{ marginTop: "8px" }}>
                    <strong>Proof Notes:</strong> {claim.proofDetails}
                  </p>
                )}

                <div className="claim-actions">
                  <button
                    onClick={() => handleVerifyClaimAdmin(claim._id, "APPROVED")}
                    className="btn-approve"
                  >
                    👑 Approve Claim (Admin Override)
                  </button>
                  <button
                    onClick={() => handleVerifyClaimAdmin(claim._id, "REJECTED")}
                    className="btn-reject"
                  >
                    ❌ Reject Claim
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Admin Edit Item Modal */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>✏️ Admin Manipulate Item #{editingItem._id.substring(0, 8)}</h3>
              <button onClick={() => setEditingItem(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveItemEdit}>
              <div className="form-group">
                <label>Item Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-input"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    {[
                      "Electronics",
                      "Mobile",
                      "Laptop",
                      "Wallet",
                      "ID Card",
                      "Books",
                      "Documents",
                      "Keys",
                      "Bag",
                      "Clothing",
                      "Accessories",
                      "Other",
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Item Status</label>
                  <select
                    className="form-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="MATCHED">MATCHED</option>
                    <option value="CLAIMED">CLAIMED</option>
                    <option value="RETURNED">RETURNED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={editLoading}>
                  {editLoading ? "Saving Changes..." : "Save Admin Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
