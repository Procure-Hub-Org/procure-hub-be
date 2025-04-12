const express = require('express');
const router = express.Router();

const procurementRequestController = require('../controllers/procurementRequestController.js');
const authMiddleware = require("../middleware/authMiddleware");

router.get('/favorites', authMiddleware.verifyToken, procurementRequestController.getFavorites);
router.post('/:id/follow', authMiddleware.verifyToken, procurementRequestController.follow);
router.delete('/:id/unfollow', authMiddleware.verifyToken, procurementRequestController.unfollow);
router.delete('/:id/unfollow', authMiddleware.verifyToken, procurementRequestController.unfollow);

module.exports = router;