const contractDocumentRepository = require('../repositories/contractDocumentRepository');
const getUploadService = require('../factories/uploadFactory');
const uploadService = getUploadService();
// const supabaseBucketService = require('../services/supabaseBucketService');

exports.getContractDocument = async (contractId) => {
    const contractDocument = await contractDocumentRepository.getContractDocument(contractId);
    if (!contractDocument) {
        return null;
    }

    const fileUrl = await uploadService.getFileUrl(contractDocument.contract_path);
    const jsonContractDocument = contractDocument.toJSON();
    jsonContractDocument.file_url = fileUrl;

    return jsonContractDocument;
}