const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

const  disputeController  = require('../controllers/disputeController.js');

// vraca disputes za odredeni contract
router.get('/disputes/:contractId', verifyToken, disputeController.getDisputesOfContract);

// POST route to create a new dispute
router.post('/new-dispute', verifyToken, disputeController.createDispute);

module.exports = router;