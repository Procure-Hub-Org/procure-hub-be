const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const  buyerAnalyticsContoller  = require('../controllers/buyerAnalyticsController.js');

// analitika za buyer
router.get('/buyer-analytics', verifyToken, buyerAnalyticsContoller.getBuyerAnalytics);

module.exports = router;