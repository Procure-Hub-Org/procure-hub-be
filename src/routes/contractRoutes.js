const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractController');
const contractController = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/new-contract',verifyToken, controller.createContract);
router.put('/contracts/:id', verifyToken, controller.updateContract);
// vraca contracts zavisno od role
router.get('/contracts', verifyToken, controller.getContracts); // query parametri email, category, start_date, end_date ili date, status
router.get('/contracts/:id', verifyToken, controller.getContractById);

// Get all logs for a specific contract (admin only)
router.get('/contracts/:id/logs', verifyToken, contractController.getContractLogs);

router.post('/contracts/:id/accept', verifyToken, controller.acceptContract);

module.exports = router;

