const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const procurementRequestController = require('../controllers/procurementRequestController');

router.get('/procurement-requests', verifyToken, procurementRequestController.getOpenProcurementRequests);
router.get('/procurement-requests/buyer', verifyToken, procurementRequestController.getBuyerProcurementRequests);


router.get('/procurement-requests/favorites', verifyToken, procurementRequestController.getFavorites);
router.post('/procurement-requests/:id/follow', verifyToken, procurementRequestController.follow);
router.delete('/procurement-requests/:id/unfollow', verifyToken, procurementRequestController.unfollow);

module.exports = router;