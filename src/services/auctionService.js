const procurementBidRepository = require('../repositories/procurementBidRepository');
const auctionRepository = require('../repositories/auctionRepository');
const { getIO } = require('../config/socket');

exports.placeBid = async ({auctionId, price, userId}) => {
    const now = new Date();
    const utcNow = new Date(now.toISOString());
    const auction = await auctionRepository.getAuction(auctionId);
    const procurementBid = await procurementBidRepository.getProcurementBid({auction_id: auctionId, seller_id: userId});
    let lastCall = false;
    const auctionEndUtc = new Date(auction.ending_time);

    // if (!auction || new Date(auction.ending_time) < now) {
        if (!auction || auctionEndUtc < utcNow){
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

    const allAuctionBids = await procurementBidRepository.getAllProcurementBidsByAuctionId(auctionId);
    const position = findBidPosition(allAuctionBids, price);

    const bidsToUpdate = allAuctionBids.filter(bid => (bid.auction_placement >= position && bid.auction_placement < procurementBid.auction_placement && bid.id !== procurementBid.id));
    for (const bid of bidsToUpdate) {
        const sideBid = await procurementBidRepository.updateProcurementBid(bid.id, {
            auction_placement: bid.auction_placement + 1,
        });
        if (!sideBid) {
            const err = new Error('Failed to update bid placement');
            err.statusCode = 500;
            throw err;
        }
    }

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

    const lastCallThreshold = new Date(auction.ending_time.getTime() - auction.last_call_timer * 60_000);
    if (updatedBid.price_submitted_at > lastCallThreshold && updatedBid.auction_placement === 1) {
        console.log('Updating auction ending time...');
        const updatedAuction = await auctionRepository.updateAuctionEndingTime(auctionId, new Date(updatedBid.price_submitted_at.getTime() + auction.last_call_timer * 60_000));
                                                                                //before: new Date(auction.ending_time.getTime() + auction.last_call_timer * 60_000)
        if (!updatedAuction) {
            const err = new Error('Failed to update auction ending time');
            err.statusCode = 500;
            throw err;
        }
        lastCall = true;
    }

    return {updatedBid, lastCall};
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