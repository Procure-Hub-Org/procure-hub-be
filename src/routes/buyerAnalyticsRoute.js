const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const  buyerAnalyticsContoller  = require('../controllers/buyerAnalyticsController.js');

// analitika za buyer
router.get('/buyer-analytics', verifyToken, buyerAnalyticsContoller.getBuyerAnalytics);
router.get('/buyer-regression', verifyToken, buyerAnalyticsContoller.getRegressionData);

module.exports = router;