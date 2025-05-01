const express = require('express');
const router = express.Router();
const { auctionController } = require('../controllers/auctionController');

router.get('/auction/:id', auctionController.getLiveAuction);

module.exports = router;
