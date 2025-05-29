const contractDocumentRepository = require('../repositories/contractDocumentRepository');
const supabaseBucketService = require('../services/supabaseBucketService');

exports.getContractDocument = async (contractId) => {
    const contractDocument = await contractDocumentRepository.getContractDocument(contractId);
    if (!contractDocument) {
        return null;
    }

    const fileUrl = await supabaseBucketService.getSignedUrl(contractDocument.contract_path);
    const jsonContractDocument = contractDocument.toJSON();
    jsonContractDocument.file_url = fileUrl;

    return jsonContractDocument;
}