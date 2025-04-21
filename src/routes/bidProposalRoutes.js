const express = require('express');
const router = express.Router();
const bidProposalController = require('../controllers/bidProposalControllers');
const { verifyToken } = require('../middleware/authMiddleware');
const { verify } = require('jsonwebtoken');


// Route for creating a bid
router.post('/bid/create', verifyToken, bidProposalController.createBid);

// Route for updating a bid
router.put('/bid/:id/update', verifyToken, bidProposalController.updateDraftBid);

// Route for submitting a bid
router.put('/bid/:id/submit', verifyToken, bidProposalController.submitDraftBid);

// Route for previewing bit by ID
router.get('/bid/:id/preview', verifyToken, bidProposalController.previewBid);

module.exports = router;