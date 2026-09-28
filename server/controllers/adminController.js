const User = require("../models/User");
const Item = require("../models/Item");
const Claim = require("../models/Claim");
const Notification = require("../models/Notification");

// Get All Registered Users (Admin Only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    console.error("Admin Get Users Error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Change User Role & Profile (Admin Only)
const updateUserAdmin = async (req, res) => {
  try {
    const { role, department, studentId, phone } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (role && ["student", "admin"].includes(role)) {
      user.role = role;
    }
    if (department !== undefined) user.department = department;
    if (studentId !== undefined) user.studentId = studentId;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.status(200).json({
      message: `User profile updated successfully`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: user.studentId,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Update User Admin Error:", error);
    res.status(500).json({ message: "Failed to update user profile" });
  }
};

// Delete User Account (Admin Only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    await user.deleteOne();
    await Item.deleteMany({ reportedBy: user._id });
    await Claim.deleteMany({ $or: [{ claimant: user._id }, { finder: user._id }] });

    res.status(200).json({ message: "User and all associated data deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

// Get All Items (Admin View)
const getAllItemsAdmin = async (req, res) => {
  try {
    const items = await Item.find()
      .populate("reportedBy", "username email role department")
      .populate("claimedBy", "username email")
      .populate("returnedTo", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({ items });
  } catch (error) {
    console.error("Admin Get Items Error:", error);
    res.status(500).json({ message: "Failed to fetch all items" });
  }
};

// Modify / Update Any Item (Admin Manipulation)
const updateItemAdmin = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const {
      title,
      description,
      type,
      category,
      location,
      date,
      color,
      brand,
      identifyingFeatures,
      status,
      contactPreference,
    } = req.body;

    if (title) item.title = title.trim();
    if (description) item.description = description.trim();
    if (type && ["LOST", "FOUND"].includes(type)) item.type = type;
    if (category) item.category = category;
    if (location) item.location = location.trim();
    if (date) item.date = date;
    if (color !== undefined) item.color = color.trim();
    if (brand !== undefined) item.brand = brand.trim();
    if (identifyingFeatures !== undefined) item.identifyingFeatures = identifyingFeatures.trim();
    if (status && ["ACTIVE", "MATCHED", "CLAIMED", "RETURNED", "CLOSED"].includes(status)) {
      item.status = status;
    }
    if (contactPreference) item.contactPreference = contactPreference;

    await item.save();

    res.status(200).json({
      message: "Item updated by Admin successfully",
      item,
    });
  } catch (error) {
    console.error("Admin Update Item Error:", error);
    res.status(500).json({ message: "Failed to update item" });
  }
};

// Delete Item (Admin Moderation)
const deleteItemAdmin = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    await item.deleteOne();
    await Claim.deleteMany({ item: item._id });

    res.status(200).json({ message: "Item report deleted by Admin" });
  } catch (error) {
    console.error("Admin Delete Item Error:", error);
    res.status(500).json({ message: "Failed to delete item" });
  }
};

// Get All Claims across platform (Admin Review)
const getAllClaimsAdmin = async (req, res) => {
  try {
    const claims = await Claim.find()
      .populate("item", "title type category location status")
      .populate("claimant", "username email phone department studentId")
      .populate("finder", "username email phone department")
      .sort({ createdAt: -1 });

    res.status(200).json({ claims });
  } catch (error) {
    console.error("Admin Get Claims Error:", error);
    res.status(500).json({ message: "Failed to fetch claims" });
  }
};

// Verify/Resolve Claim as Admin
const verifyClaimAdmin = async (req, res) => {
  try {
    const { status, finderNotes } = req.body;
    const claim = await Claim.findById(req.params.claimId).populate("item");

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    if (!["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    claim.status = status;
    if (finderNotes) claim.finderNotes = `[ADMIN OVERRIDE] ${finderNotes}`;
    await claim.save();

    const item = await Item.findById(claim.item._id);

    if (status === "APPROVED" && item) {
      item.status = "CLAIMED";
      item.claimedBy = claim.claimant;
      await item.save();

      // Notify claimant
      await Notification.create({
        recipient: claim.claimant,
        sender: req.user.id,
        type: "CLAIM_APPROVED",
        item: item._id,
        message: `Admin APPROVED your claim for "${item.title}"! Contact finder or admin for pickup.`,
      });
    }

    res.status(200).json({
      message: `Claim status updated to ${status} by Admin`,
      claim,
    });
  } catch (error) {
    console.error("Admin Verify Claim Error:", error);
    res.status(500).json({ message: "Failed to resolve claim" });
  }
};

module.exports = {
  getAllUsers,
  updateUserAdmin,
  deleteUser,
  getAllItemsAdmin,
  updateItemAdmin,
  deleteItemAdmin,
  getAllClaimsAdmin,
  verifyClaimAdmin,
};
