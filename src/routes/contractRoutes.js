const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractController');
const contractController = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/new-contract',verifyToken, controller.createContract);

// vraca contracts zavisno od role
router.get('/contracts', verifyToken, controller.getContracts);

// Get all logs for a specific contract (admin only)
router.get('/contracts/:id/logs', verifyToken, contractController.getContractLogs);

module.exports = router;

