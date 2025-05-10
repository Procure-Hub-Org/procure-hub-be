const express = require('express');
const router = express.Router();
const sellerAnalyticsController = require('../controllers/sellerAnalyticsController');
const { verifyToken } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');


router.post('/seller-analytics', verifyToken, sellerAnalyticsController.getSellerAnalytics);

module.exports = router;