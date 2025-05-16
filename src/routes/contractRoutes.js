const express = require('express');
const router = express.Router();
const controller = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/new-contract',verifyToken, controller.createContract);

module.exports = router;
