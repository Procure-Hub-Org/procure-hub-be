const { getContractChangeRequests } = require('../controllers/contractChangeRequestsController');
const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/requested-changes/:contractId', verifyToken, getContractChangeRequests);

module.exports = router;