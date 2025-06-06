const express = require('express');
const router = express.Router();
const sellerReportController = require('../controllers/sellerReportController');
const { verifyToken } = require('../middleware/authMiddleware');

// GET route to fetch all reports created by a specific seller
router.get('/seller-reports/:sellerId', verifyToken, sellerReportController.getSellerReports);

// POST route to create a new suspicious activity report
router.post('/new-suspicious-activity', verifyToken, sellerReportController.createSuspiciousActivity);

module.exports = router;