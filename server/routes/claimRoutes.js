const express = require("express");
const router = express.Router();

const {
  submitClaim,
  getItemClaims,
  getMyClaims,
  verifyClaim,
  markItemReturned,
} = require("../controllers/claimController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");

router.post("/", protect, upload.single("proofImage"), submitClaim);
router.get("/my-claims", protect, getMyClaims);
router.get("/item/:itemId", protect, getItemClaims);
router.put("/:id/verify", protect, verifyClaim);
router.put("/item/:itemId/returned", protect, markItemReturned);

module.exports = router;
