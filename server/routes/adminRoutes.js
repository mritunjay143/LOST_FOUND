const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  updateUserAdmin,
  deleteUser,
  getAllItemsAdmin,
  updateItemAdmin,
  deleteItemAdmin,
  getAllClaimsAdmin,
  verifyClaimAdmin,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All admin routes protected by protect + adminOnly
router.use(protect);
router.use(adminOnly);

// User Management
router.get("/users", getAllUsers);
router.put("/users/:userId", updateUserAdmin);
router.put("/users/:userId/role", updateUserAdmin);
router.delete("/users/:userId", deleteUser);

// Item Moderation & Manipulation
router.get("/items", getAllItemsAdmin);
router.put("/items/:itemId", updateItemAdmin);
router.delete("/items/:itemId", deleteItemAdmin);

// Claims & Dispute Resolution
router.get("/claims", getAllClaimsAdmin);
router.put("/claims/:claimId/verify", verifyClaimAdmin);

module.exports = router;
