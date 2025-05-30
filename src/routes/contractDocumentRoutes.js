const express = require('express');
const router = express.Router();

const contractDocumentController = require('../controllers/contractDocumentController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/contracts/:id/add-documents', verifyToken, upload.single('file'), contractDocumentController.uploadContractDocument);
router.delete('/contracts/:id/remove-document', verifyToken, contractDocumentController.deleteContractDocument);
router.get('/contracts/:id/documents', verifyToken, contractDocumentController.getContractDocument);

module.exports = router;