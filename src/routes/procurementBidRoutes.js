const express = require('express');
const router = express.Router();
const procurementBidController = require('../controllers/procurementBidController');
const { verifyToken } = require('../middleware/authMiddleware');

// fetch all seller's bids
router.get('/bids/user/:userId', verifyToken, procurementBidController.getSellerBids);

module.exports = router;