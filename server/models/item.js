const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["LOST", "FOUND"],
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
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
      ],
      default: "Other",
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    approximateTime: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
      trim: true,
    },
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    identifyingFeatures: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    additionalImages: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["ACTIVE", "MATCHED", "CLAIMED", "RETURNED", "CLOSED"],
      default: "ACTIVE",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    returnedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    contactPreference: {
      type: String,
      enum: ["CHAT", "EMAIL", "PHONE"],
      default: "CHAT",
    },
    verificationQuestions: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent re-compilation model error if required multiple times
const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);

module.exports = Item;