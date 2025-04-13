const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const procurementRequestController = require('../controllers/procurementRequestController');

router.get('/procurement-requests',verifyToken, procurementRequestController.getOpenProcurementRequests);
router.get('/procurement-requests/buyer', verifyToken, procurementRequestController.getBuyerProcurementRequests);

module.exports = router;