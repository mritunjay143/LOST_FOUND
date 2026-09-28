const User = require("../models/User");
const OTP = require("../models/OTP");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTPEmail } = require("../utils/sendEmail");

// Generate JWT Token with user ID & role
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || "mySuperSecretKey123",
    { expiresIn: "7d" }
  );
};

// Send OTP to Email Controller
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // College Email Domain Check if configured
    const requiredDomain = process.env.COLLEGE_EMAIL_DOMAIN;
    if (requiredDomain && !trimmedEmail.endsWith(`@${requiredDomain.replace("@", "")}`)) {
      return res.status(400).json({
        message: `Email must belong to the college domain: @${requiredDomain}`,
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete existing OTP for this email if any
    await OTP.deleteMany({ email: trimmedEmail });

    // Save new OTP to database (TTL index handles 10-minute expiry)
    await OTP.create({
      email: trimmedEmail,
      otp,
    });

    // Send Real Email via Nodemailer SMTP
    await sendOTPEmail(trimmedEmail, otp);

    res.status(200).json({
      message: `Verification OTP code sent to ${trimmedEmail}. Please check your email inbox and spam folder.`,
    });
  } catch (error) {
    console.error("Send OTP Error:", error.message);
    res.status(400).json({
      message: error.message || "Failed to send OTP verification email",
    });
  }
};

// Signup Controller (Requires Email OTP Verification & Strict Admin Secret Check)
const signup = async (req, res) => {
  try {
    const { username, email, password, otp, role, adminSecret, phone, department, studentId } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({
        message: "Please fill in all required fields (Username, Email, Password, OTP Code)",
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOTP = otp.trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // College Email Domain Check if configured
    const requiredDomain = process.env.COLLEGE_EMAIL_DOMAIN;
    if (requiredDomain && !trimmedEmail.endsWith(`@${requiredDomain.replace("@", "")}`)) {
      return res.status(400).json({
        message: `Email must belong to the college domain: @${requiredDomain}`,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Strict Role & Admin Secret Verification
    let userRole = "student";
    if (role === "admin") {
      const validAdminSecret = process.env.ADMIN_SECRET || "MRITUNJAY8080@";
      if (!adminSecret || adminSecret.trim() !== validAdminSecret) {
        return res.status(400).json({
          message: "Invalid Admin registration secret passcode. You cannot register as an Administrator without the correct secret passcode.",
        });
      }
      userRole = "admin";
    }

    // Verify OTP against Database
    const otpRecord = await OTP.findOne({ email: trimmedEmail }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        message: "OTP expired or not requested. Please click 'Send OTP' to receive a new code.",
      });
    }

    if (otpRecord.otp !== trimmedOTP) {
      return res.status(400).json({
        message: "Invalid OTP code. Please check your email inbox and enter the correct 6-digit code.",
      });
    }

    // Check duplicate email
    const emailExists = await User.findOne({ email: trimmedEmail });
    if (emailExists) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Check duplicate username
    const usernameExists = await User.findOne({ username: trimmedUsername });
    if (usernameExists) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    // Delete verified OTP record
    await OTP.deleteMany({ email: trimmedEmail });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword,
      role: userRole,
      phone: phone || "",
      department: department || "",
      studentId: studentId || "",
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: `Signup Successful (${user.role.toUpperCase()} Account)`,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department,
        studentId: user.studentId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      message: error.message || "Server error during registration",
    });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginInput = (identifier || email || "").trim();

    if (!loginInput || !password) {
      return res.status(400).json({
        message: "Please enter your Email/Username and Password",
      });
    }

    // Allow logging in with either email or username
    const user = await User.findOne({
      $or: [{ email: loginInput.toLowerCase() }, { username: loginInput }],
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials. Account not found.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials. Incorrect password.",
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: `Login Successful (${user.role.toUpperCase()} Portal)`,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department,
        studentId: user.studentId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: error.message || "Server error during login",
    });
  }
};

// Get Current User Profile Controller
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json({ user });
  } catch (error) {
    console.error("GetMe Error:", error);
    res.status(500).json({
      message: "Server error fetching user profile",
    });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { phone, department, studentId, avatar } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (studentId !== undefined) user.studentId = studentId;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department,
        studentId: user.studentId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("UpdateProfile Error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

module.exports = {
  sendOTP,
  signup,
  login,
  getMe,
  updateProfile,
};