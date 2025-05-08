const procurementBidRepository = require('../repositories/procurementBidRepository');
const auctionRepository = require('../repositories/auctionRepository');
const {User: User} = require("../../database/models");
const {ProcurementRequest: ProcurementRequest} = require("../../database/models");

const path = require('path');

const { getIO } = require('../config/socket');

const { sendMail } = require('../services/mailService.js'); // Import sendMail function from mailService.js
const {generateOutbidEmailHtml} = require('../utils/templates/emailTemplates');


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

    // curent leader
    const previousLeader = allAuctionBids.find(bid => bid.auction_placement === 1 && bid.id !== procurementBid.id);
    let previousLeaderUser = null;

    if (previousLeader) {
        previousLeaderUser = await User.findByPk(previousLeader.seller_id);
    }

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

    const procurementRequest = await ProcurementRequest.findByPk(auction.procurement_request_id);
    if (position === 1 && previousLeaderUser && previousLeaderUser.email) {
        const previousLeaderUserBid = await procurementBidRepository.getProcurementBid({auction_id: auctionId, seller_id: previousLeaderUser.id});
        
        const htmlContent = generateOutbidEmailHtml({
            user: previousLeaderUser,
            requestTitle: procurementRequest.title,
            auctionPrice: previousLeaderUserBid.auction_price,
            auctionId: auctionId,
        });

        await sendMail({
            to: previousLeaderUser.email,
            subject: 'You have been outbid',
            text: `Respected ${previousLeaderUser.last_name} ${previousLeaderUser.first_name}, \nSomeone has placed a lower bid than yours in an auction \"${procurementRequest.title}\". \nYou are no longer in the first place.`,
            html: htmlContent, // Use the generated HTML content
        });
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
    const lastCallThreshold = new Date(new Date(auction.ending_time).getTime() - auction.last_call_timer * 60_000);
    if (updatedBid.price_submitted_at > lastCallThreshold && updatedBid.auction_placement === 1) {
        console.log('Updating auction ending time...');
        const updatedAuction = await auctionRepository.updateAuctionEndingTime(auctionId, new Date(new Date(updatedBid.price_submitted_at).getTime() + auction.last_call_timer * 60_000));
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