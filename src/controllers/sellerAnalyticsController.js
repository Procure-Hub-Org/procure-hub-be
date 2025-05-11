const { getSellerAnalytics } = require('../services/sellerAnalyticsService');
const { Op } = require('sequelize');

exports.getAllSellerAnalytics = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const sellerId = req.user.id;
        const analytics = await getSellerAnalytics(sellerId);
        res.status(200).json(analytics);
    } catch (error) {
        console.error("Error fetching seller analytics: ", error.message);
        res.status(500).json({ message: error.message });
    }
}