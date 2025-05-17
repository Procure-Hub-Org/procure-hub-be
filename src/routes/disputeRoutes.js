const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST route to create a new dispute
router.post('/new-dispute', verifyToken, disputeController.createDispute);

module.exports = router;