const express = require('express');
const procurementController = require('../controllers/procurementController.js');
const { verifyToken, isSeller } = require('../middleware/authMiddleware'); // adjust if your middleware naming differs

const router = express.Router();

router.get(
  '/procurement-requests',
  verifyToken,      
  procurementController.getOpenProcurementRequests
);

module.exports = router;
