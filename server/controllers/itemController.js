const Item = require("../models/Item");
const Notification = require("../models/Notification");
const { getImageUrl } = require("../config/cloudinary");

// Calculate Match Score percentage between a Lost item and a Found item
const calculateMatchScore = (lostItem, foundItem) => {
  let score = 0;
  let maxScore = 100;

  // Category match (30 points)
  if (lostItem.category.toLowerCase() === foundItem.category.toLowerCase()) {
    score += 30;
  } else {
    return 0; // Different category = no match
  }

  // Color match (20 points)
  if (
    lostItem.color &&
    foundItem.color &&
    lostItem.color.toLowerCase() === foundItem.color.toLowerCase()
  ) {
    score += 20;
  }

  // Brand match (20 points)
  if (
    lostItem.brand &&
    foundItem.brand &&
    lostItem.brand.toLowerCase() === foundItem.brand.toLowerCase()
  ) {
    score += 20;
  }

  // Location similarity (15 points)
  if (
    lostItem.location &&
    foundItem.location &&
    (lostItem.location.toLowerCase().includes(foundItem.location.toLowerCase()) ||
      foundItem.location.toLowerCase().includes(lostItem.location.toLowerCase()))
  ) {
    score += 15;
  }

  // Text title & description overlap (15 points)
  const lostWords = `${lostItem.title} ${lostItem.description}`
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
  const foundText = `${foundItem.title} ${foundItem.description}`.toLowerCase();

  let matchedWords = 0;
  lostWords.forEach((word) => {
    if (foundText.includes(word)) matchedWords++;
  });

  if (lostWords.length > 0) {
    score += Math.min(15, Math.round((matchedWords / lostWords.length) * 15));
  }

  return Math.min(100, score);
};

// Create a new Lost / Found Item
const createItem = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      location,
      date,
      approximateTime,
      color,
      brand,
      identifyingFeatures,
      contactPreference,
      verificationQuestions,
    } = req.body;

    if (!title || !description || !type || !category || !location || !date) {
      return res.status(400).json({
        message: "Please fill in all required fields (title, description, type, category, location, date)",
      });
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = getImageUrl(req, req.file);
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    let parsedQuestions = [];
    if (verificationQuestions) {
      if (typeof verificationQuestions === "string") {
        try {
          parsedQuestions = JSON.parse(verificationQuestions);
        } catch (e) {
          parsedQuestions = verificationQuestions.split(",").map((q) => q.trim());
        }
      } else if (Array.isArray(verificationQuestions)) {
        parsedQuestions = verificationQuestions;
      }
    }

    const item = await Item.create({
      title: title.trim(),
      description: description.trim(),
      type,
      category,
      location: location.trim(),
      date,
      approximateTime: approximateTime || "",
      color: color ? color.trim() : "",
      brand: brand ? brand.trim() : "",
      identifyingFeatures: identifyingFeatures ? identifyingFeatures.trim() : "",
      imageUrl,
      contactPreference: contactPreference || "CHAT",
      verificationQuestions: parsedQuestions,
      reportedBy: req.user.id,
      status: "ACTIVE",
    });

    await item.populate("reportedBy", "username email role avatar");

    // Scan for potential matches asynchronously & create notifications
    const oppositeType = type === "LOST" ? "FOUND" : "LOST";
    const candidates = await Item.find({
      type: oppositeType,
      category: item.category,
      status: "ACTIVE",
      reportedBy: { $ne: req.user.id },
    }).populate("reportedBy", "username email");

    candidates.forEach(async (cand) => {
      const lostItem = type === "LOST" ? item : cand;
      const foundItem = type === "FOUND" ? item : cand;
      const score = calculateMatchScore(lostItem, foundItem);

      if (score >= 50) {
        // Create match notification for candidate reporter
        await Notification.create({
          recipient: cand.reportedBy._id,
          sender: req.user.id,
          type: "MATCH",
          item: cand._id,
          message: `Possible match (${score}%) found for your ${cand.type.toLowerCase()} item "${cand.title}"!`,
        });
      }
    });

    res.status(201).json({
      message: `${type === "LOST" ? "Lost" : "Found"} report submitted successfully`,
      item,
    });
  } catch (error) {
    console.error("Create Item Error:", error);
    res.status(500).json({
      message: error.message || "Failed to create item report",
    });
  }
};

// Get Items with Search, Multi-Filter, Sorting & Pagination
const getItems = async (req, res) => {
  try {
    const {
      search,
      type,
      category,
      location,
      color,
      brand,
      status,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    if (type) query.type = type.toUpperCase();
    if (category && category !== "ALL") query.category = category;
    if (status && status !== "ALL") query.status = status.toUpperCase();

    if (color) query.color = { $regex: color, $options: "i" };
    if (brand) query.brand = { $regex: brand, $options: "i" };
    if (location) query.location = { $regex: location, $options: "i" };

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { brand: searchRegex },
        { color: searchRegex },
        { category: searchRegex },
        { identifyingFeatures: searchRegex },
      ];
    }

    // Sorting logic
    let sortOptions = { createdAt: -1 };
    if (sort === "oldest") sortOptions = { createdAt: 1 };
    if (sort === "recently_updated") sortOptions = { updatedAt: -1 };

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const total = await Item.countDocuments(query);
    const items = await Item.find(query)
      .populate("reportedBy", "username email role avatar")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      items,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("Get Items Error:", error);
    res.status(500).json({
      message: "Failed to fetch items",
    });
  }
};

// Get Single Item Details
const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("reportedBy", "username email role phone department avatar")
      .populate("claimedBy", "username email")
      .populate("returnedTo", "username email");

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ item });
  } catch (error) {
    console.error("Get Item By ID Error:", error);
    res.status(500).json({ message: "Server error fetching item details" });
  }
};

// Get Items Reported By Current User
const getMyItems = async (req, res) => {
  try {
    const items = await Item.find({ reportedBy: req.user.id })
      .populate("reportedBy", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({ items });
  } catch (error) {
    console.error("Get My Items Error:", error);
    res.status(500).json({ message: "Failed to fetch user items" });
  }
};

// Update Item
const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check authorization: Owner or Admin only
    if (item.reportedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to update this item" });
    }

    const {
      title,
      description,
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
    if (category) item.category = category;
    if (location) item.location = location.trim();
    if (date) item.date = date;
    if (color !== undefined) item.color = color.trim();
    if (brand !== undefined) item.brand = brand.trim();
    if (identifyingFeatures !== undefined) item.identifyingFeatures = identifyingFeatures.trim();
    if (status) item.status = status;
    if (contactPreference) item.contactPreference = contactPreference;

    if (req.file) {
      item.imageUrl = getImageUrl(req, req.file);
    } else if (req.body.imageUrl) {
      item.imageUrl = req.body.imageUrl;
    }

    await item.save();

    res.status(200).json({
      message: "Item updated successfully",
      item,
    });
  } catch (error) {
    console.error("Update Item Error:", error);
    res.status(500).json({ message: "Failed to update item" });
  }
};

// Delete Item
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Authorization: Owner or Admin
    if (item.reportedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this item" });
    }

    await item.deleteOne();

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Delete Item Error:", error);
    res.status(500).json({ message: "Failed to delete item" });
  }
};

// Get Matches for an Item
const getItemMatches = async (req, res) => {
  try {
    const targetItem = await Item.findById(req.params.id);

    if (!targetItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    const oppositeType = targetItem.type === "LOST" ? "FOUND" : "LOST";
    const candidates = await Item.find({
      type: oppositeType,
      category: targetItem.category,
      status: { $ne: "CLOSED" },
      _id: { $ne: targetItem._id },
    }).populate("reportedBy", "username email avatar");

    const matches = candidates
      .map((cand) => {
        const lostItem = targetItem.type === "LOST" ? targetItem : cand;
        const foundItem = targetItem.type === "FOUND" ? targetItem : cand;
        const matchScore = calculateMatchScore(lostItem, foundItem);
        return {
          item: cand,
          matchScore,
        };
      })
      .filter((m) => m.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({ matches });
  } catch (error) {
    console.error("Get Item Matches Error:", error);
    res.status(500).json({ message: "Failed to find matching items" });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  getMyItems,
  updateItem,
  deleteItem,
  getItemMatches,
};