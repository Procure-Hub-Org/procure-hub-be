const express = require('express');
const router = express.Router();
const multer = require('multer');

const bidDocumentController = require('../controllers/bidDocumentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = multer();

router.post('/bid-documents/upload', verifyToken, upload.single('file'), bidDocumentController.uploadBidDocument);
router.delete('/bid-documents/:id/remove', verifyToken, bidDocumentController.deleteBidDocument);


module.exports = router;
