const express = require('express');
const router = express.Router();
const controller = require('../controllers/auctionHistoryController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/auction/:id/history', verifyToken, controller.getAuctionHistory);

module.exports = router;
