const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const  auctionDashboardContoller  = require('../controllers/auctionDashboardContoller.js');

// vraca sve o aukcijama vezane za usera
router.get('/auctions-dashboard', verifyToken, auctionDashboardContoller.getDashboard);

module.exports = router;