import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Claim Modal State
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [verificationAnswers, setVerificationAnswers] = useState({});
  const [proofDetails, setProofDetails] = useState("");
  const [proofImageFile, setProofImageFile] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  const isReporter = item && user && item.reportedBy?._id === user.id;

  const fetchItemData = async () => {
    try {
      setLoading(true);
      setError("");

      const itemRes = await api.get(`/items/${id}`);
      const currentItem = itemRes.data.item;
      setItem(currentItem);

      // Initialize verification answers state
      if (currentItem.verificationQuestions?.length > 0) {
        const initialAnswers = {};
        currentItem.verificationQuestions.forEach((q, idx) => {
          initialAnswers[idx] = "";
        });
        setVerificationAnswers(initialAnswers);
      }

      // Fetch possible matches
      const matchesRes = await api.get(`/items/${id}/matches`);
      setMatches(matchesRes.data.matches || []);

      // If user is reporter or admin, fetch submitted claims
      if (user && (currentItem.reportedBy?._id === user.id || user.role === "admin")) {
        try {
          const claimsRes = await api.get(`/claims/item/${id}`);
          setClaims(claimsRes.data.claims || []);
        } catch (e) {
          console.error("Claims fetch error:", e);
        }
      }
    } catch (err) {
      console.error("Item details fetch error:", err);
      setError(err.response?.data?.message || "Failed to load item details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemData();
  }, [id, user]);

  const handleStartChat = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const response = await api.post("/chat/conversation", {
        itemId: item._id,
        recipientId: item.reportedBy._id,
      });
      navigate(`/chat?conversationId=${response.data.conversation._id}`);
    } catch (err) {
      console.error("Start chat error:", err);
      alert(err.response?.data?.message || "Failed to start chat.");
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setClaimError("");
    setClaimSuccess("");

    setClaimLoading(true);
    try {
      const formattedAnswers = (item.verificationQuestions || []).map((q, idx) => ({
        question: q,
        answer: verificationAnswers[idx] || "N/A",
      }));

      const formData = new FormData();
      formData.append("itemId", item._id);
      formData.append("proofDetails", proofDetails);
      formData.append("verificationAnswers", JSON.stringify(formattedAnswers));

      if (proofImageFile) {
        formData.append("proofImage", proofImageFile);
      }

      const res = await api.post("/claims", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setClaimSuccess(res.data.message || "Claim submitted successfully!");
      setTimeout(() => {
        setShowClaimModal(false);
        fetchItemData();
      }, 1200);
    } catch (err) {
      console.error("Claim Submit Error:", err);
      setClaimError(err.response?.data?.message || "Failed to submit claim.");
    } finally {
      setClaimLoading(false);
    }
  };

  const handleVerifyClaimStatus = async (claimId, newStatus) => {
    try {
      await api.put(`/claims/${claimId}/verify`, { status: newStatus });
      fetchItemData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update claim");
    }
  };

  const handleMarkReturned = async () => {
    if (!window.confirm("Are you sure you want to mark this item as RETURNED?")) return;
    try {
      await api.put(`/claims/item/${item._id}/returned`);
      fetchItemData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to mark item returned");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="empty-state-box" style={{ marginTop: "40px" }}>
        <h3>⚠️ Item Not Found</h3>
        <p>{error || "The requested item could not be found."}</p>
        <Link to="/search" className="btn-hero-secondary" style={{ marginTop: "16px" }}>
          Back to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="item-details-container">
      <div className="details-header-row">
        <Link to="/search" className="btn-back">
          ← Back to Search
        </Link>
        <div className="details-badges">
          <span className={`badge-type ${item.type.toLowerCase()}`}>
            {item.type === "LOST" ? "🔴 LOST ITEM" : "🟢 FOUND ITEM"}
          </span>
          <span className={`badge-status ${item.status.toLowerCase()}`}>
            Status: {item.status}
          </span>
        </div>
      </div>

      <div className="details-grid">
        {/* Left Gallery / Image */}
        <div className="details-gallery-box">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="details-main-image" />
          ) : (
            <div className="details-no-image">
              <span>📷 No Image Uploaded</span>
            </div>
          )}
        </div>

        {/* Right Info Box */}
        <div className="details-info-box">
          <h1 className="details-title">{item.title}</h1>

          <div className="details-meta-grid">
            <div className="meta-card">
              <span className="meta-label">Category</span>
              <span className="meta-value">📂 {item.category}</span>
            </div>

            <div className="meta-card">
              <span className="meta-label">{item.type === "LOST" ? "Location Lost" : "Location Found"}</span>
              <span className="meta-value">📍 {item.location}</span>
            </div>

            <div className="meta-card">
              <span className="meta-label">Date</span>
              <span className="meta-value">📅 {new Date(item.date).toLocaleDateString()}</span>
            </div>

            {item.approximateTime && (
              <div className="meta-card">
                <span className="meta-label">Approximate Time</span>
                <span className="meta-value">⏰ {item.approximateTime}</span>
              </div>
            )}

            {item.color && (
              <div className="meta-card">
                <span className="meta-label">Color</span>
                <span className="meta-value">🎨 {item.color}</span>
              </div>
            )}

            {item.brand && (
              <div className="meta-card">
                <span className="meta-label">Brand / Model</span>
                <span className="meta-value">🏷️ {item.brand}</span>
              </div>
            )}
          </div>

          <div className="details-description-section">
            <h3>Description</h3>
            <p>{item.description}</p>
          </div>

          {item.identifyingFeatures && (
            <div className="details-features-section">
              <h3>Identifying Features</h3>
              <p>{item.identifyingFeatures}</p>
            </div>
          )}

          {/* Reporter Information */}
          <div className="reporter-info-box">
            <span className="reporter-label">Reported by</span>
            <div className="reporter-profile">
              <div className="avatar-circle">
                {item.reportedBy?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <strong>{item.reportedBy?.username}</strong>
                <p className="reporter-sub">{item.reportedBy?.department || "Student"}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="details-actions-bar">
            {!isReporter && (
              <button onClick={handleStartChat} className="btn-action-chat">
                💬 Start Secure Chat
              </button>
            )}

            {item.type === "FOUND" && !isReporter && item.status === "ACTIVE" && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="btn-action-claim"
              >
                🔐 Submit Claim & Prove Ownership
              </button>
            )}

            {(isReporter || user?.role === "admin") && item.status !== "RETURNED" && (
              <button onClick={handleMarkReturned} className="btn-action-returned">
                🎉 Mark as RETURNED
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Possible Matches Engine Section */}
      <section className="matches-section">
        <h3>🤖 Possible Candidate Matches</h3>
        <p>Our smart match engine calculates similarity scores based on item category, title, color, and location.</p>

        {matches.length === 0 ? (
          <p className="notif-empty">No high-confidence candidate matches found yet.</p>
        ) : (
          <div className="matches-grid">
            {matches.map(({ item: mItem, matchScore }) => (
              <div key={mItem._id} className="match-card">
                <div className="match-score-badge">Match Score: {matchScore}%</div>
                <h4>{mItem.title}</h4>
                <p>{mItem.description.substring(0, 60)}...</p>
                <div className="match-meta">
                  <span>📍 {mItem.location}</span>
                  <span>📅 {new Date(mItem.date).toLocaleDateString()}</span>
                </div>
                <Link to={`/items/${mItem._id}`} className="btn-view-details" style={{ display: "block", marginTop: "8px", textAlign: "center" }}>
                  View Candidate
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submitted Claims Section (For Finder / Admin) */}
      {(isReporter || user?.role === "admin") && claims.length > 0 && (
        <section className="claims-section">
          <h3>📋 Submitted Claims for Ownership Verification</h3>

          <div className="claims-list">
            {claims.map((claim) => (
              <div key={claim._id} className="claim-card">
                <div className="claim-header">
                  <div>
                    <strong>Claimant: {claim.claimant?.username}</strong> ({claim.claimant?.email})
                  </div>
                  <span className={`badge-status ${claim.status.toLowerCase()}`}>
                    {claim.status}
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
                  <p className="proof-text">
                    <strong>Proof Notes:</strong> {claim.proofDetails}
                  </p>
                )}

                {claim.status === "PENDING" && (
                  <div className="claim-actions">
                    <button
                      onClick={() => handleVerifyClaimStatus(claim._id, "APPROVED")}
                      className="btn-approve"
                    >
                      ✅ Approve Ownership
                    </button>
                    <button
                      onClick={() => handleVerifyClaimStatus(claim._id, "REJECTED")}
                      className="btn-reject"
                    >
                      ❌ Reject Claim
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claim Submission Modal */}
      {showClaimModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🔐 Ownership Verification Form</h3>
              <button onClick={() => setShowClaimModal(false)}>✕</button>
            </div>

            {claimError && <div className="alert-banner error">⚠️ {claimError}</div>}
            {claimSuccess && <div className="alert-banner success">✅ {claimSuccess}</div>}

            <form onSubmit={handleClaimSubmit}>
              <p className="modal-intro">
                Answer the finder's verification questions accurately to prove you are the owner.
              </p>

              {(item.verificationQuestions || []).map((q, idx) => (
                <div key={idx} className="form-group">
                  <label>Question {idx + 1}: {q}</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    placeholder="Provide exact details..."
                    value={verificationAnswers[idx] || ""}
                    onChange={(e) =>
                      setVerificationAnswers({
                        ...verificationAnswers,
                        [idx]: e.target.value,
                      })
                    }
                    required
                  ></textarea>
                </div>
              ))}

              <div className="form-group">
                <label>Additional Proof / Serial Numbers / Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Provide purchase receipt details, serial number, or wallpaper description..."
                  value={proofDetails}
                  onChange={(e) => setProofDetails(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="btn-modal-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={claimLoading}>
                  {claimLoading ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemDetails;
