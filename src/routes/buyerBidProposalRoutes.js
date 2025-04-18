const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');;
const controller = require('../controllers/bidProposalsAndEvaluationController');
// Route to get all buyer bid proposals
router.get('/bid-proposals/:procurementRequestId', verifyToken, controller.getBidProposals);

module.exports = router;

