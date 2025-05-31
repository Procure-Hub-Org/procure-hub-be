const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/new-contract',verifyToken, controller.createContract);
router.put('/contracts/:id', verifyToken, controller.updateContract);
// vraca contracts zavisno od role
router.get('/contracts', verifyToken, controller.getContracts);

module.exports = router;

