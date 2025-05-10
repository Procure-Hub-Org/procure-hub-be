const procurementrequest = require('../../database/models/procurementrequest');
const { ProcurementBid, ProcurementRequest, Auction, ProcurementCategory  } = require('../database/models');

exports.getSellerAnalytics = async (sellerId) => {
    // Ge the total number of bids placed by the seller 
    const totalBids = await ProcurementBid.findAll({
        where: { seller_id: sellerId },
        include: [{
            model: Auction,
            as: 'auction',
            include: [{
                model: ProcurementRequest,
                as: 'procurementRequest',
                include: [{
                    model: ProcurementCategory,
                    as: 'category'
                }]
            }]
    }]
    });

    let totalBidsCount = totalBids.length;

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

    let awardedBidsCount = awardedBids.length;

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

    let avgOfRatios = (sumOfRatios / totalAuctionCount) * 100;
    
    let avgPriceReduction = 100 - avgOfRatios;

    let awardedBidsByCategory = {};
    let submittedBidsByCategory = {};


    // Count total number of bids submitted by yhe seller for each category
    for (const bid of totalBids) {
        const category = bid.auction?.procurementRequest?.category;
        if (!category) continue;

        const categoryName = category.name;
        if (!submittedBidsByCategory[categoryName]) {
            submittedBidsByCategory[categoryName] = 0;
        }
        submittedBidsByCategory[categoryName]++;
    }

    // Count awarded bids per category
    for (const bid of awardedBids) {
        const bidWithCategory = await ProcurementBid.findByPk(bid.id, {
            include: [{
                model: Auction,
                as: 'auction',
                include: [{
                    model: ProcurementRequest,
                    as: 'procurementRequest',
                    include: [{
                        model: ProcurementCategory,
                        as: 'category'
                    }]
                }]
            }]
        });

        const category = bidWithCategory?.auction?.procurementRequest?.category;
        if (!category) continue;

        const categoryName = category.name;
        if (!awardedBidsByCategory[categoryName]) {
            awardedBidsByCategory[categoryName] = 0;
        }
        awardedBidsByCategory[categoryName]++;
    }

    const submittedBidPercentages = {};
    const awardedBidPercentages = {};

    for (const category in submittedBidsByCategory) {
        submittedBidPercentages[category] = (submittedBidsByCategory[category] / totalSubmitted) * 100;
    }

    for (const category in awardedBidsByCategory) {
        awardedBidPercentages[category] = (awardedBidsByCategory[category] / totalAwarded) * 100;
    }

    return {
        totalBidsCount,
        awardedBidsCount,
        ratio,
        totalAuctionCount,
        avgOfRatios,
        avgPriceReduction,
        submittedBidPercentages,
        awardedBidPercentages
    }
}
