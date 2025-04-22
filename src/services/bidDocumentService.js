const bidDocumentRepository = require("../repositories/bidDocumentRepository");
const supabaseBucketService = require("../services/supabaseBucketService");

exports.getBidDocumentsByProcurementBidId = async (procurementBidId) => {
    const bidDocuments = await bidDocumentRepository.getBidDocumentsByProcurementBidId(procurementBidId);
    if (!bidDocuments) {
        return null;
    }

    const documentsWithUrls = bidDocuments.map(async (doc) => {
        const fileUrl = await supabaseBucketService.getSignedUrl(doc.file_path);
        const jsonDoc = doc.toJSON();
        jsonDoc.file_url = fileUrl;
        return jsonDoc;
    });
    
    return Promise.all(documentsWithUrls);
}