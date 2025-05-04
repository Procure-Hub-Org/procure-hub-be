const { getLiveAuctionData } = require('../services/auctionInformationService');
const { getIO } = require('../config/socket');
const auctionService = require('../services/auctionService');

exports.getLiveAuction = async (req, res) => {
    try {
        const auctionId = req.params.id;
        const data = await getLiveAuctionData(auctionId);
        res.status(200).json(data);

        const io = getIO();
        io.to(`auction-${auctionId}`).emit('auctionData', data); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.placeBid = async (req, res) => {
    try {
        const { auctionId, price } = req.body;
        const userId = req.user.id;
        
        const updatedBid = await auctionService.placeBid({ auctionId, price, userId });

        res.status(201).json(updatedBid);
    } catch (error) {
        console.error("Error placing bid: ", error.message);
        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({ message: error.message });
    }
}