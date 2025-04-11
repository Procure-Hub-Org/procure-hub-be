const express = require('express');
const router = express.Router();
const procurementController = require('../controllers/procurementRequestController');
const { verifyToken } = require('../middleware/authMiddleware');


// kreiranje zahtjeva za nabavku
router.post('/procurement/create-procurement', verifyToken, procurementController.createProcurementRequest);

module.exports = router;
