const express = require('express');
const router = express.Router();
const procurementController = require('../controllers/procurementRequestController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// kreiranje zahtjeva za nabavku
router.post('/procurement/create', upload.single('documentation'), verifyToken, procurementController.createProcurementRequest);

//PUT route to update procurement request status
router.put('/procurement/:id/status',verifyToken, procurementController.updateProcurementRequestStatus);

//PUT route to update procurement request 
router.put('/procurement/:id/update', upload.single('documentation'),verifyToken, procurementController.updateProcurementRequest);
module.exports = router;
