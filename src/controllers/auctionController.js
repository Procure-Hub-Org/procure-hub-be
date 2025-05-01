const { getLiveAuctionData } = require('../services/auctionService');

exports.getLiveAuction = async (req, res) => {
    try {
        const auctionId = req.params.id;
        const data = await getLiveAuctionData(auctionId);
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getLiveAuction
};
