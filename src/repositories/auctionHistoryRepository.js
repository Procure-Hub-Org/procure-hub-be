const db = require("../../database/models");

exports.addAuctionHistory = async (auctionId, bidId, submittedAt, prevPosition, newPosition) => {
    try {
        const auctionHistory = await db.AuctionHistory.create({
            auction_id: auctionId,
            bid_id: bidId,
            price_submitted_at: submittedAt,
            previous_position: prevPosition,
            new_position: newPosition,
        });
        return auctionHistory;
    } catch (error) {
        console.error("Error adding auction history: ", error);
        return null;
    }
}