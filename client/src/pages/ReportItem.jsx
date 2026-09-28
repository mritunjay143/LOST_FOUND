import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";

const CATEGORIES = [
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
];

function ReportItem({ defaultType = "LOST" }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isFoundInitial =
    location.pathname.includes("found") || defaultType === "FOUND";

  const [type, setType] = useState(isFoundInitial ? "FOUND" : "LOST");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [approximateTime, setApproximateTime] = useState("");
  const [color, setColor] = useState("");
  const [brand, setBrand] = useState("");
  const [identifyingFeatures, setIdentifyingFeatures] = useState("");
  const [contactPreference, setContactPreference] = useState("CHAT");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Verification Questions for Found Item Claims
  const [verificationQuestions, setVerificationQuestions] = useState([
    "What specific contents or wallpaper/lockscreen details are inside/on the item?",
    "Can you describe any unique scratches, serial numbers, or identifying marks?",
  ]);
  const [newQuestion, setNewQuestion] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (location.pathname.includes("found")) {
      setType("FOUND");
    } else if (location.pathname.includes("lost")) {
      setType("LOST");
    }
  }, [location.pathname]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setVerificationQuestions([...verificationQuestions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (index) => {
    setVerificationQuestions(verificationQuestions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title || !description || !category || !locationName || !date) {
      setError("Please fill in all required fields marked with *");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("type", type);
      formData.append("category", category);
      formData.append("location", locationName);
      formData.append("date", date);
      formData.append("approximateTime", approximateTime);
      formData.append("color", color);
      formData.append("brand", brand);
      formData.append("identifyingFeatures", identifyingFeatures);
      formData.append("contactPreference", contactPreference);

      if (type === "FOUND") {
        formData.append("verificationQuestions", JSON.stringify(verificationQuestions));
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await api.post("/items", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess(response.data.message || "Report submitted successfully!");
      setTimeout(() => {
        navigate(`/items/${response.data.item._id}`);
      }, 1000);
    } catch (err) {
      console.error("Report Item Error:", err);
      setError(
        err.response?.data?.message || "Failed to submit report. Please check inputs."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-container">
      <div className="report-card">
        <div className="report-header">
          <h2>Report a {type === "LOST" ? "Lost" : "Found"} Item</h2>
          <p>
            Provide detailed information to help reunite the item with its rightful owner.
          </p>

          <div className="type-toggle-bar">
            <button
              type="button"
              className={`type-toggle-btn lost ${type === "LOST" ? "active" : ""}`}
              onClick={() => setType("LOST")}
            >
              🔴 I LOST an Item
            </button>
            <button
              type="button"
              className={`type-toggle-btn found ${type === "FOUND" ? "active" : ""}`}
              onClick={() => setType("FOUND")}
            >
              🟢 I FOUND an Item
            </button>
          </div>
        </div>

        {error && <div className="alert-banner error">⚠️ {error}</div>}
        {success && <div className="alert-banner success">✅ {success}</div>}

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-group">
            <label htmlFor="title">Item Title / Name *</label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="e.g. Black Leather Wallet or iPhone 13 Pro"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location">
                {type === "LOST" ? "Location Lost *" : "Location Found *"}
              </label>
              <input
                id="location"
                type="text"
                className="form-input"
                placeholder="e.g. Central Library 2nd Floor or Sports Complex"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">
                {type === "LOST" ? "Date Lost *" : "Date Found *"}
              </label>
              <input
                id="date"
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Approximate Time</label>
              <input
                id="time"
                type="text"
                className="form-input"
                placeholder="e.g. Around 2:30 PM"
                value={approximateTime}
                onChange={(e) => setApproximateTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="color">Primary Color</label>
              <input
                id="color"
                type="text"
                className="form-input"
                placeholder="e.g. Blue / Silver"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="brand">Brand / Model</label>
              <input
                id="brand"
                type="text"
                className="form-input"
                placeholder="e.g. Apple, Dell, Nike, Samsonite"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Detailed Description *</label>
            <textarea
              id="description"
              className="form-input textarea"
              rows="4"
              placeholder="Provide a comprehensive description of the item..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="features">Identifying Features / Marks</label>
            <input
              id="features"
              type="text"
              className="form-input"
              placeholder="e.g. Sticker on back, scratched corner, key ring with initials"
              value={identifyingFeatures}
              onChange={(e) => setIdentifyingFeatures(e.target.value)}
            />
          </div>

          {/* Image Upload Box */}
          <div className="form-group">
            <label>Item Image (JPG, PNG, WebP up to 5MB)</label>
            <div className="image-upload-dropzone">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                id="image-file-input"
                className="file-input-hidden"
              />
              <label htmlFor="image-file-input" className="upload-label">
                {imagePreview ? (
                  <div className="image-preview-wrapper">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <span>Click or drag to change image</span>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <span className="upload-icon">📷</span>
                    <span>Click to upload item photo from device</span>
                    <span className="upload-hint">Recommended for faster recovery</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Verification Questions Q&A (For Found Items) */}
          {type === "FOUND" && (
            <div className="verification-q-box">
              <h4>🔒 Verification Questions for Ownership Claims</h4>
              <p>
                To prevent false claims, list questions that claimants must answer to prove ownership (e.g. wallpaper picture, contents inside).
              </p>

              <div className="q-list">
                {verificationQuestions.map((q, idx) => (
                  <div key={idx} className="q-item">
                    <span>Q{idx + 1}: {q}</span>
                    <button
                      type="button"
                      className="btn-remove-q"
                      onClick={() => handleRemoveQuestion(idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-q-input-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add custom verification question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-add-q"
                  onClick={handleAddQuestion}
                >
                  + Add Question
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Submitting Report...
              </>
            ) : (
              `SUBMIT ${type} ITEM REPORT`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReportItem;
