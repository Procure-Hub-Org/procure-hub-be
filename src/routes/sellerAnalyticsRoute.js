const express = require('express');
const router = express.Router();
const sellerAnalyticsController = require('../controllers/sellerAnalyticsController');
const { verifyToken } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');


router.get('/seller-analytics', verifyToken, sellerAnalyticsController.getAllSellerAnalytics);

router.get('/seller-regression', verifyToken, sellerAnalyticsController.getSellerRegression);

module.exports = router;