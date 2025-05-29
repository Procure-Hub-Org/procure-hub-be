const path = require('path');
const crypto = require('crypto');

const supabaseBucketService = require("../services/supabaseBucketService");
const contractDocumentRepository = require("../repositories/contractDocumentRepository");
const contractDocumentService = require("../services/contractDocumentService");

exports.uploadContractDocument = async (req, res) => {
    if(req.fileValidationError) {
        return res.status(400).json({ message: req.fileValidationError });
    }

    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    //const contractId = req.body.id;
    const contractId = req.params.id; // contract ID is passed as a URL parameter
    const originalName = file.originalname;
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const destinationPath = `documents/contract_${contractId}_${uniqueName}${extension}`;

    const result = await supabaseBucketService.uploadFile(file.buffer, file.mimetype, destinationPath);
    if (!result) {
        return res.status(500).json({ message: "Failed to upload file" });
    }

    const contractDocument = await contractDocumentRepository.addContractDocument(contractId, originalName, result.path, file.mimetype);
    if (!contractDocument) {
        return res.status(500).json({ message: "Failed to save document information" });
    }

    return res.status(200).json({ message: "Uploaded successfully", contractDocument });
}

exports.deleteContractDocument = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "No contract_id provided" });
    }

    const contractDocument = await contractDocumentRepository.getContractDocument(id);
    if (!contractDocument) {
        return res.status(404).json({ message: "Document not found" });
    }

    const filePath = contractDocument.contract_path;

    const removedCount = await contractDocumentRepository.removeContractDocument(id);
    if (!removedCount) {
        return res.status(500).json({ message: "Failed to delete document information" });
    }

    const deleted = await supabaseBucketService.deleteFile(filePath);

    return res.status(200).json({ message: "File deleted successfully" });
}

exports.getContractDocument = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "No contract_id provided" });
    }

    const contractDocument = await contractDocumentService.getContractDocument(id);
    if (!contractDocument || !contractDocument.contract_path) {
        return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json(contractDocument);
}