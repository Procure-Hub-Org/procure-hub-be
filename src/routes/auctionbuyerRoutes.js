const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/buyerAuctionController');
const { verifyToken } = require('../middleware/authMiddleware');


router.post('/auctions', verifyToken, auctionController.createAuction);

module.exports = router;
