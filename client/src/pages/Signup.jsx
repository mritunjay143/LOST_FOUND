import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [adminSecret, setAdminSecret] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [studentId, setStudentId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification State
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  // Countdown timer for Resend OTP button
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOTP = async () => {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setOtpLoading(true);

    try {
      const res = await api.post("/auth/send-otp", { email });
      setSuccess(res.data.message || "OTP verification code sent to your email inbox!");
      setOtpSent(true);
      setResendTimer(60); // 60 seconds resend cooldown
    } catch (err) {
      console.error("Send OTP error:", err);
      setError(
        err.response?.data?.message || "Failed to send OTP verification code."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (role === "admin" && !adminSecret.trim()) {
      setError("Admin registration requires a valid secret passcode.");
      return;
    }

    if (!otpSent || !otp) {
      setError("Please click 'Send OTP' and enter the 6-digit verification code sent to your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/signup", {
        username,
        email,
        password,
        otp,
        role,
        adminSecret,
        phone,
        department,
        studentId,
      });

      setSuccess(response.data.message || "Account verified & created successfully!");
      if (response.data.token && response.data.user) {
        login(response.data.token, response.data.user);
      }

      setTimeout(() => {
        if (response.data.user.role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }, 700);
    } catch (err) {
      console.error("Signup Error:", err);
      setError(
        err.response?.data?.message || "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">EMAIL VERIFIED REGISTRATION</div>
          <h2>Create Account</h2>
          <p>Register with mandatory Email OTP verification sent to your email inbox.</p>
        </div>

        {error && (
          <div className="alert-banner error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-banner success">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="auth-form">
          {/* Account Role Selector */}
          <div className="form-group">
            <label>Register As</label>
            <div className="filter-radio-group">
              <button
                type="button"
                className={`chip-btn ${role === "student" ? "active" : ""}`}
                onClick={() => setRole("student")}
              >
                🎓 Student
              </button>
              <button
                type="button"
                className={`chip-btn ${role === "admin" ? "active" : ""}`}
                onClick={() => setRole("admin")}
              >
                👑 Administrator
              </button>
            </div>
          </div>

          {role === "admin" && (
            <div className="form-group">
              <label htmlFor="adminSecret">Admin Secret Passcode *</label>
              <div className="input-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  id="adminSecret"
                  type="password"
                  className="form-input"
                  placeholder="Enter secret passcode"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="alex_doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <div className="input-wrapper email-otp-row">
              <span className="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="user@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={otpSent && loading}
              />
              <button
                type="button"
                className="btn-send-otp"
                onClick={handleSendOTP}
                disabled={otpLoading || resendTimer > 0}
              >
                {otpLoading
                  ? "Sending..."
                  : resendTimer > 0
                  ? `Resend (${resendTimer}s)`
                  : otpSent
                  ? "Resend OTP"
                  : "Send OTP"}
              </button>
            </div>
          </div>

          {/* OTP Verification Input Box */}
          {otpSent && (
            <div className="form-group otp-box-highlight">
              <label htmlFor="otp">Enter 6-Digit Email OTP *</label>
              <div className="input-wrapper">
                <span className="input-icon">🔐</span>
                <input
                  id="otp"
                  type="text"
                  maxLength="6"
                  className="form-input otp-input"
                  placeholder="e.g. 482910"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
              <span className="otp-hint-text">
                Check your email inbox or spam folder for the 6-digit verification code.
              </span>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <div className="input-wrapper">
                <span className="input-icon">🎓</span>
                <input
                  id="department"
                  type="text"
                  className="form-input"
                  placeholder="Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="studentId">Student / Employee ID</label>
              <div className="input-wrapper">
                <span className="input-icon">🆔</span>
                <input
                  id="studentId"
                  type="text"
                  className="form-input"
                  placeholder="CS2026-88"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Contact Number (Optional)</label>
            <div className="input-wrapper">
              <span className="input-icon">📞</span>
              <input
                id="phone"
                type="tel"
                className="form-input"
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className="input-wrapper">
              <span className="input-icon">🔑</span>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading || !otpSent}>
            {loading ? (
              <>
                <span className="spinner"></span> Verifying OTP & Creating Account...
              </>
            ) : (
              `VERIFY OTP & SIGN UP AS ${role.toUpperCase()}`
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already registered?{" "}
          <Link to="/login" id="ln">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
