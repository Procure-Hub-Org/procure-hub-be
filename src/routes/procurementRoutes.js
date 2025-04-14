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

//GET route to get 
router.get('/procurement-request/:id',verify, procurementController.getProcurementRequestDetails);
module.exports = router;
