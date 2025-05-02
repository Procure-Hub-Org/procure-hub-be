const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auctionController');

router.get('/auction/:id', auctionController.getLiveAuction);



router.get('/test/socket/:id', async (req, res) => {
    try {
        const { getLiveAuctionData } = require('../services/auctionInformationService');
        const { getIO } = require('../config/socket');
        const io = getIO();

        const auctionId = req.params.id;
        const data = await getLiveAuctionData(auctionId);

        // Emituj podatke svim klijentima u toj sobi
        io.to(`auction-${auctionId}`).emit('auctionData', data);

        res.status(200).json({ message: 'Emitovano', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
