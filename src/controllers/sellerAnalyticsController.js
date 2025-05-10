const { getSellerAnalytics } = require('../services/sellerAnalyticsService');
const { Op } = require('sequelize');

exports.getSellerAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const analytics = await getSellerAnalytics(sellerId);
        res.status(200).json(analytics);
    } catch (error) {
        console.error("Error fetching seller analytics: ", error.message);
        res.status(500).json({ message: error.message });
    }
}