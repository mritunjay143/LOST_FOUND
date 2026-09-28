const Claim = require("../models/Claim");
const Item = require("../models/Item");
const Notification = require("../models/Notification");
const { getImageUrl } = require("../config/cloudinary");

// Submit Ownership Claim for Found Item
const submitClaim = async (req, res) => {
  try {
    const { itemId, verificationAnswers, proofDetails } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.type !== "FOUND") {
      return res.status(400).json({ message: "Claims can only be submitted for FOUND items" });
    }

    if (item.reportedBy.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot submit a claim for an item you reported yourself" });
    }

    // Prevent duplicate active claims by same user for same item
    const existingClaim = await Claim.findOne({
      item: itemId,
      claimant: req.user.id,
      status: { $in: ["PENDING", "APPROVED"] },
    });

    if (existingClaim) {
      return res.status(400).json({ message: "You have already submitted an active claim for this item" });
    }

    let proofImageUrl = "";
    if (req.file) {
      proofImageUrl = getImageUrl(req, req.file);
    } else if (req.body.proofImageUrl) {
      proofImageUrl = req.body.proofImageUrl;
    }

    let parsedAnswers = [];
    if (verificationAnswers) {
      if (typeof verificationAnswers === "string") {
        try {
          parsedAnswers = JSON.parse(verificationAnswers);
        } catch (e) {
          parsedAnswers = [];
        }
      } else if (Array.isArray(verificationAnswers)) {
        parsedAnswers = verificationAnswers;
      }
    }

    const claim = await Claim.create({
      item: itemId,
      claimant: req.user.id,
      finder: item.reportedBy,
      verificationAnswers: parsedAnswers,
      proofDetails: proofDetails || "",
      proofImageUrl,
      status: "PENDING",
    });

    // Notify Finder
    await Notification.create({
      recipient: item.reportedBy,
      sender: req.user.id,
      type: "CLAIM_SUBMITTED",
      item: item._id,
      message: `${req.user.username} submitted an ownership claim for your found item "${item.title}".`,
    });

    res.status(201).json({
      message: "Ownership claim submitted successfully. The finder will review your verification answers.",
      claim,
    });
  } catch (error) {
    console.error("Submit Claim Error:", error);
    res.status(500).json({ message: error.message || "Failed to submit claim" });
  }
};

// Get Claims for a Specific Item (Finder or Admin)
const getItemClaims = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Authorization: Item finder or Admin
    if (item.reportedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view claims for this item" });
    }

    const claims = await Claim.find({ item: req.params.itemId })
      .populate("claimant", "username email phone department studentId avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ claims });
  } catch (error) {
    console.error("Get Item Claims Error:", error);
    res.status(500).json({ message: "Failed to fetch claims" });
  }
};

// Get Claims Submitted by Current User
const getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ claimant: req.user.id })
      .populate("item")
      .populate("finder", "username email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ claims });
  } catch (error) {
    console.error("Get My Claims Error:", error);
    res.status(500).json({ message: "Failed to fetch your claims" });
  }
};

// Verify/Update Claim Status (Finder approves or rejects claim)
const verifyClaim = async (req, res) => {
  try {
    const { status, finderNotes } = req.body; // APPROVED, REJECTED
    const claim = await Claim.findById(req.params.id).populate("item");

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    // Authorization: Finder or Admin
    if (claim.finder.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to verify this claim" });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Status must be APPROVED or REJECTED" });
    }

    claim.status = status;
    if (finderNotes) claim.finderNotes = finderNotes;
    await claim.save();

    const item = await Item.findById(claim.item._id);

    if (status === "APPROVED") {
      item.status = "CLAIMED";
      item.claimedBy = claim.claimant;
      await item.save();

      // Reject all other pending claims for this item
      await Claim.updateMany(
        { item: item._id, _id: { $ne: claim._id }, status: "PENDING" },
        { status: "REJECTED", finderNotes: "Another claim was approved for this item." }
      );

      // Notify Claimant
      await Notification.create({
        recipient: claim.claimant,
        sender: req.user.id,
        type: "CLAIM_APPROVED",
        item: item._id,
        message: `Your claim for item "${item.title}" was APPROVED! Contact the finder to arrange pickup.`,
      });
    } else if (status === "REJECTED") {
      await Notification.create({
        recipient: claim.claimant,
        sender: req.user.id,
        type: "CLAIM_REJECTED",
        item: item._id,
        message: `Your claim for item "${item.title}" was not approved by the finder.`,
      });
    }

    res.status(200).json({
      message: `Claim status updated to ${status}`,
      claim,
      item,
    });
  } catch (error) {
    console.error("Verify Claim Error:", error);
    res.status(500).json({ message: "Failed to update claim status" });
  }
};

// Mark Item as RETURNED
const markItemReturned = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Authorized if user is reporter, claimant, or admin
    const isReporter = item.reportedBy.toString() === req.user.id;
    const isClaimant = item.claimedBy && item.claimedBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isReporter && !isClaimant && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to mark this item as returned" });
    }

    item.status = "RETURNED";
    if (!item.returnedTo && item.claimedBy) {
      item.returnedTo = item.claimedBy;
    }
    await item.save();

    // Create notification
    const recipient = isReporter ? item.claimedBy : item.reportedBy;
    if (recipient) {
      await Notification.create({
        recipient,
        sender: req.user.id,
        type: "ITEM_RETURNED",
        item: item._id,
        message: `Item "${item.title}" has been officially marked as RETURNED!`,
      });
    }

    res.status(200).json({
      message: "Item marked as RETURNED successfully",
      item,
    });
  } catch (error) {
    console.error("Mark Returned Error:", error);
    res.status(500).json({ message: "Failed to update return status" });
  }
};

module.exports = {
  submitClaim,
  getItemClaims,
  getMyClaims,
  verifyClaim,
  markItemReturned,
};
