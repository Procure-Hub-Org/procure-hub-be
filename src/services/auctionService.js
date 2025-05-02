const procurementBidRepository = require('../repositories/procurementBidRepository');
const auctionRepository = require('../repositories/auctionRepository');
const { getIO } = require('../config/socket');

exports.placeBid = async ({auctionId, price, userId}) => {
    const now = new Date();
    const auction = await auctionRepository.getAuction(auctionId);
    const procurementBid = await procurementBidRepository.getProcurementBid({auction_id: auctionId, seller_id: userId});

    if (!auction || new Date(auction.ending_time) < now) {
        const err = new Error('Auction has ended or does not exist');
        err.statusCode = 400;
        throw err;
    }
    if (!procurementBid) {
        const err = new Error('You have not been invited to this auction');
        err.statusCode = 400;
        throw err;
    }
    if (price <= 0 || price > procurementBid.auction_price - auction.min_increment) {
        const err = new Error('Invalid price');
        err.statusCode = 400;
        throw err;
    }

    const allAuctionBids = await procurementBidRepository.getAllProcurementBidsByAuctionId({auction_id: auctionId});
    const position = findBidPosition(allAuctionBids, price);

    const updatedBid = await procurementBidRepository.updateProcurementBid(procurementBid.id, {
        auction_price: price, 
        price_submitted_at: now,
        auction_placement: position,
    });
    if (!updatedBid) {
        const err = new Error('Failed to update bid');
        err.statusCode = 500;
        throw err;
    }
    
    if (updatedBid.price_submitted_at > new Date(auction.ending_time - auction.last_call_timer)) {
        const auction = await auctionRepository.updateAuctionEndingTime(auctionId, new Date(auction.ending_time + auction.last_call_timer));
        if (!auction) {
            const err = new Error('Failed to update auction ending time');
            err.statusCode = 500;
            throw err;
        }
    }

    return updatedBid;
}

const findBidPosition = (allAuctionBids, newBidPrice) => {
    let left = 0;
    let right = allAuctionBids.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midPrice = allAuctionBids[mid].auction_price;

        if (midPrice === newBidPrice) {
            return mid + 1;
        }

        if (midPrice < newBidPrice) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return left + 1; 
};