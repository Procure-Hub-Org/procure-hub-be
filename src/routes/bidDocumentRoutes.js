const express = require('express');
const router = express.Router();

const bidDocumentController = require('../controllers/bidDocumentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/bid-documents/upload', verifyToken, upload.single('file'), bidDocumentController.uploadBidDocument);
router.delete('/bid-documents/:id/remove', verifyToken, bidDocumentController.deleteBidDocument);
router.get('/procurement-bid/:id/bid-documents', verifyToken, bidDocumentController.getBidDocumentsByProcurementBidId);


module.exports = router;
