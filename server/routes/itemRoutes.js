const express = require("express");
const router = express.Router();

const {
  createItem,
  getItems,
  getItemById,
  getMyItems,
  updateItem,
  deleteItem,
  getItemMatches,
} = require("../controllers/itemController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");

router.get("/", getItems);
router.get("/my-items", protect, getMyItems);
router.get("/:id/matches", getItemMatches);
router.get("/:id", getItemById);

router.post("/", protect, upload.single("image"), createItem);
router.put("/:id", protect, upload.single("image"), updateItem);
router.delete("/:id", protect, deleteItem);

module.exports = router;