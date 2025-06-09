const bidDocumentRepository = require("../repositories/bidDocumentRepository");
const getUploadService = require("../factories/uploadFactory");
const uploadService = getUploadService();
// const supabaseBucketService = require("../services/supabaseBucketService");

exports.getBidDocumentsByProcurementBidId = async (procurementBidId) => {
    const bidDocuments = await bidDocumentRepository.getBidDocumentsByProcurementBidId(procurementBidId);
    if (!bidDocuments) {
        return null;
    }

    const documentsWithUrls = bidDocuments.map(async (doc) => {
        const fileUrl = await uploadService.getFileUrl(doc.file_path);
        const jsonDoc = doc.toJSON();
        jsonDoc.file_url = fileUrl;
        return jsonDoc;
    });
    
    return Promise.all(documentsWithUrls);
}