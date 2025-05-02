const auctionService = require('../services/auctionService');

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