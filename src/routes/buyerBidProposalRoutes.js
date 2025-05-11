const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');;
const controller = require('../controllers/bidProposalsAndEvaluationController');
// Route to get all buyer bid proposals
router.get('/bid-proposals/:procurementRequestId', verifyToken, controller.getBidProposals);
router.post('/evaluate-bid',verifyToken, controller.evaluateBidCriteria);
router.get('/bids/:bidId/criteria', controller.getCriteriaByBidProposal);
router.get('/bids/documents/:documentId', controller.getBidDocumentFile);
router.get('/procurement-requests/:id/criteria', controller.getEvaluationCriteriaByProcurementRequestId);
module.exports = router;
