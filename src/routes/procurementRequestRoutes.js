const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const procurementRequestController = require('../controllers/procurementRequestController');

router.get('/buyer', verifyToken, async (req, res) => procurementRequestController.getBuyerProcurementRequests(req, res));

module.exports = router;