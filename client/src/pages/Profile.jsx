import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Profile() {
  const { user, updateUser } = useAuth();

  const [phone, setPhone] = useState(user?.phone || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [studentId, setStudentId] = useState(user?.studentId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    setLoading(true);

    try {
      const response = await api.put("/auth/profile", {
        phone,
        department,
        studentId,
      });

      setSuccess("Profile updated successfully!");
      updateUser(response.data.user);
    } catch (err) {
      console.error("Update Profile Error:", err);
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar-circle-large">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <h2>{user?.username}</h2>
          <p className="role-tag">{user?.role?.toUpperCase() || "STUDENT"}</p>
        </div>

        {error && <div className="alert-banner error">⚠️ {error}</div>}
        {success && <div className="alert-banner success">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input type="text" className="form-input" value={user?.username || ""} disabled />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="form-input" value={user?.email || ""} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <input
              id="department"
              type="text"
              className="form-input"
              placeholder="e.g. Computer Science & Engineering"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="studentId">Student ID</label>
            <input
              id="studentId"
              type="text"
              className="form-input"
              placeholder="e.g. CS2026-88"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Contact Number</label>
            <input
              id="phone"
              type="tel"
              className="form-input"
              placeholder="+1 555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
