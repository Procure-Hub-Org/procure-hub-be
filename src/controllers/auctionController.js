const { getLiveAuctionData } = require('../services/auctionInformationService');
const { getIO } = require('../config/socket');

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
