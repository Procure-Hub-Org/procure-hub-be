const db = require("../../database/models");

exports.addBidDocument = async (procurementBidId, originalName, filePath, fileType) => {
    try {
        const bidDocument = await db.BidDocument.create({
            procurement_bid_id: procurementBidId,
            original_name: originalName,
            file_path: filePath,
            file_type: fileType,
        });

        return bidDocument;
    } catch (error) {
        console.error("Error adding a bid document: ", error);
        return null;
    }
};

exports.removeBidDocument = async (bidDocumentId) => {
    try {
        const bidDocument = await db.BidDocument.destroy({
            where: {
                id: bidDocumentId,
            },
        });

        return bidDocument;
    } catch (error) {
        console.error("Error removing a bid document: ", error);
        return false;
    }
};

exports.getBidDocument = async (bidDocumentId) => {
    try {
        const bidDocument = await db.BidDocument.findOne({
            where: {
                id: bidDocumentId,
            },
        });

        return bidDocument;
    } catch (error) {
        console.error("Error fetching a bid document: ", error);
        return null;
    }
}