const { getContractChangeRequests, postContractChangeRequest } = require('../controllers/contractChangeRequestsController');
const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/requested-changes/:contractId', verifyToken, getContractChangeRequests);

router.post('/contract/:contractId/request-change', verifyToken, postContractChangeRequest);

module.exports = router;