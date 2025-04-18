const express = require('express');
const router = express.Router();
const procurementController = require('../controllers/procurementRequestBuyerController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { verify } = require('jsonwebtoken');

// kreiranje zahtjeva za nabavku
router.post('/procurement/create',  verifyToken, procurementController.createProcurementRequest);

//PUT route to update procurement request status
router.put('/procurement/:id/status',verifyToken, procurementController.updateProcurementRequestStatus);

//PUT route to update procurement request 
router.put('/procurement/:id/update',verifyToken, procurementController.updateProcurementRequest);

// GET route to get all details for a specific procurement request
router.get('/procurement-request/:id',verifyToken, procurementController.getProcurementRequestDetails);

// GET route to get all bids for a specific procurement request
router.get('/procurement/:id/bids',verifyToken, procurementController.getBidsForProcurement);
module.exports = router;
