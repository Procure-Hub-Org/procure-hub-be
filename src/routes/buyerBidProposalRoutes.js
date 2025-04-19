const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');;
const controller = require('../controllers/bidProposalsAndEvaluationController');
// Route to get all buyer bid proposals
router.get('/bid-proposals/:procurementRequestId', verifyToken, controller.getBidProposals);
router.post('/evaluate-bid',verifyToken, controller.evaluateBidCriteria);
router.post('/evaluate/final/:bidId', verifyToken,controller.evaluateFinalScore);
module.exports = router;
