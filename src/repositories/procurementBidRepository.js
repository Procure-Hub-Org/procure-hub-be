const { or } = require("sequelize");
const db = require("../../database/models");

exports.getProcurementBid = async (query) => {
    try {
        const procurementBid = await db.ProcurementBid.findOne({
            where: query
        });

        return procurementBid;
    } catch (error) {
        console.error("Error fetching a procurement bid: ", error);
        return null;
    }
}

exports.updateProcurementBid = async (procurementBidId, updates) => {
    try {
        const [updatedRows, [procurementBid]] = await db.ProcurementBid.update(updates, {
            where: {
                id: procurementBidId,
                returning: true
            }
        });

        return procurementBid;
    } catch (error) {
        console.error("Error updating a procurement bid: ", error);
        return null;
    }
}

exports.getAllProcurementBidsByAuctionId = async (auctionId) => {
    try {
        const procurementBids = await db.ProcurementBid.findAll({
            where: {
                auction_id: auctionId
            },
            order: [['auction_price', 'ASC']],
        });

        return procurementBids;
    } catch (error) {
        console.error("Error fetching all procurement bids by auction ID: ", error);
        return null;
    }
}