const procurementrequest = require('../../database/models/procurementrequest');
const { ProcurementBid, ProcurementRequest, Auction  } = require('../database/models');

const getSellerAnalytics = async (sellerId) => {
    // Ge the total number of bids placed by the seller 
    const totalBids = await ProcurementBid.count({
        where: { seller_id: sellerId }
    });

    // Get all procurement requests that have awarded status (some bid won)
    const awardedRequests = await ProcurementRequest.findAll({
        where: { status: 'awarded' },
        include: [{
            model: ProcurementBid,
            as: 'bids'
        }]
    });

    let awardedBids = [];

    // For each awarded request, find the best bid and check if the seller made it
    for (const request of awardedRequests) {
        const bids = request.bids;
        
        if( !bids || bids.length === 0) {
            continue;
        }

        const bestBid = bids.reduce((min, bid) => (bid.price < min.price ? bid : min), bids[0]);
        if (bestBid.seller_id === sellerId) {
            awardedBids.push(bestBid);
        }
    }

    // Calculate the ratio of awarded bids to total bids made by the seller
    const ratio = totalBids > 0 ? (awardedBids / totalBids) * 100 : 0;

    // Number of auctions the seller participated in (checks if bid associated with seller has auction_id)
    const totalAuction = await ProcurementBid.findAll({
        where: { 
            seller_id: sellerId, 
            auction_id: { [Op.ne] : null}
        }
    });

    const totalAuctionCount = totalAuction.length;
    const sumOfRatios = 0;

    // Find ratio of auction price to bid price for each auction
    for (const auction of totalAuction) {
        let ratioPerAuction = auction.auction_price / auction.price;
        sumOfRatios += ratioPerAuction;
    }

    avgOfRatios = (sumOfRatios / totalAuctionCount) * 100;
    
    avgPriceReduction = 100 - avgOfRatios;




}