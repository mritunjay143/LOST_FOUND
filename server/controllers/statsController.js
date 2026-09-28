const Item = require("../models/Item");
const User = require("../models/User");
const Claim = require("../models/Claim");

// Get Dynamic System Statistics
const getGlobalStats = async (req, res) => {
  try {
    const totalLost = await Item.countDocuments({ type: "LOST" });
    const totalFound = await Item.countDocuments({ type: "FOUND" });
    const totalReturned = await Item.countDocuments({ status: "RETURNED" });
    const totalActive = await Item.countDocuments({ status: "ACTIVE" });
    const totalClaimed = await Item.countDocuments({ status: "CLAIMED" });
    const activeUsers = await User.countDocuments();
    const successfulMatches = await Claim.countDocuments({ status: "APPROVED" });

    const stillMissing = await Item.countDocuments({ type: "LOST", status: { $ne: "RETURNED" } });

    // Category distribution aggregation
    const categoryStats = await Item.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          lostCount: {
            $sum: { $cond: [{ $eq: ["$type", "LOST"] }, 1, 0] },
          },
          foundCount: {
            $sum: { $cond: [{ $eq: ["$type", "FOUND"] }, 1, 0] },
          },
          returnedCount: {
            $sum: { $cond: [{ $eq: ["$status", "RETURNED"] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalReports = totalLost + totalFound;
    const returnRate = totalReports > 0 ? Math.round((totalReturned / totalReports) * 100) : 0;

    res.status(200).json({
      stats: {
        totalReports,
        totalLost,
        totalFound,
        totalReturned,
        stillMissing,
        totalActive,
        totalClaimed,
        successfulMatches,
        activeUsers,
        returnRate,
      },
      categoryStats,
    });
  } catch (error) {
    console.error("Get Global Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch platform statistics" });
  }
};

module.exports = {
  getGlobalStats,
};
