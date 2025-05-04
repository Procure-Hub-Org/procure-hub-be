const db = require("../../database/models");
const {redisClient, redisConnected} = require('../services/redisService');


exports.getAuction = async (auctionId) => {
    const cacheKey = `auction:${auctionId}`;
    if (redisConnected()) {
        const cachedAuction = await redisClient().get(cacheKey);
        if (cachedAuction) {
            console.log('Cache hit for auction:', cachedAuction);
            return JSON.parse(cachedAuction);
        }
        console.log('Cache miss for auction, fetching from DB...');
    }
    try {
        const auction = await db.Auction.findOne({
            where: {
                id: auctionId,
            },
        });
        if (redisConnected()) {
            await redisClient().set(cacheKey, JSON.stringify(auction), { EX: 3600 }); // Cache for 1 hour
        }
        return auction;
    } catch (error) {
        console.error("Error fetching an auction: ", error);
        return null;
    }
}

exports.updateAuctionEndingTime = async (auctionId, newEndTime) => {
    const cacheKey = `auction:${auctionId}`;
    if (redisConnected()) {
        await redisClient().del(cacheKey); // Invalidate the cache
    }
    try {
        const [rowsUpdated, [auction]] = await db.Auction.update(
            { ending_time: newEndTime },
            { 
                where: { id: auctionId },
                returning: true
            }
        );

        return auction;
    } catch (error) {
        console.error("Error updating auction ending time: ", error);
        return null;
    }
}