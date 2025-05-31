const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/new-contract',verifyToken, controller.createContract);

// vraca contracts zavisno od role
router.get('/contracts', verifyToken, controller.getContracts); // query parametri email, category, start_date, end_date ili date, status
router.get('/contracts/:id', verifyToken, controller.getContractById);

module.exports = router;

