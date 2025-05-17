const express = require('express');
const router = express.Router();
const procurementBidController = require('../controllers/procurementBidController');
const { verifyToken } = require('../middleware/authMiddleware');

// fetch all seller's bids
router.get('/bids/user/:userId', verifyToken, procurementBidController.getSellerBids);
router.get('/bids/request-ids', verifyToken, procurementBidController.getRequestIdsWithMyBids);
router.get('/procurement-bid/:id',verifyToken,procurementBidController.getProcurementBidById);

module.exports = router;