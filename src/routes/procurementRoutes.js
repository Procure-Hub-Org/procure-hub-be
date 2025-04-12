const express = require('express');
const procurementController = require('../controllers/procurementController.js');
const { verifyToken } = require('../middleware/authMiddleware'); 

const router = express.Router();

router.get(
  '/procurement-requests',
  verifyToken,      
  procurementController.getOpenProcurementRequests
);

module.exports = router;
