const path = require('path');
const crypto = require('crypto');

const getUploadService = require('../factories/uploadFactory');
// const supabaseBucketService = require("../services/supabaseBucketService");
const bidDocumentRepository = require("../repositories/bidDocumentRepository");
const bidDocumentService = require("../services/bidDocumentService");

const uploadService = getUploadService();

exports.uploadBidDocument = async (req, res) => {
    if (req.fileValidationError) {
        return res.status(400).json({ message: req.fileValidationError });
    }

    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const userId = req.user.id;
    const procurementBidId = req.body.procurement_bid_id;
    const originalName = file.originalname;
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const destinationPath = `documents/user_${userId}_bid_${procurementBidId}_${uniqueName}${extension}`;

    const result = await uploadService.uploadFile(file.buffer, file.mimetype, destinationPath);
    if (!result) {
        return res.status(500).json({ message: "Failed to upload file" });
    }

    const bidDocument = await bidDocumentRepository.addBidDocument(procurementBidId, originalName, result.path, file.mimetype);
    if (!bidDocument) {
        return res.status(500).json({ message: "Failed to save document information" });
    }


    return res.status(200).json({ message: "Uploaded successfully", bidDocument });
}

exports.deleteBidDocument = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "No ID provided" });
    }

    const bidDocument = await bidDocumentRepository.getBidDocument(id);
    if (!bidDocument) {
        return res.status(404).json({ message: "Document not found" });
    }

    const filePath = bidDocument.file_path;

    const removedCount = await bidDocumentRepository.removeBidDocument(id);
    if (!removedCount) {
        return res.status(500).json({ message: "Failed to delete document information" });
    }

    const deleted = await uploadService.deleteFile(filePath);

    return res.status(200).json({ message: "File deleted successfully" });
}

exports.getBidDocumentsByProcurementBidId = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "No ID provided" });
    }

    const bidDocuments = await bidDocumentService.getBidDocumentsByProcurementBidId(id);
    if (!bidDocuments) {
        return res.status(404).json({ message: "No documents found" });
    }

    return res.status(200).json(bidDocuments);
}
