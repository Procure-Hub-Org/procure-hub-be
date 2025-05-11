const procurementrequest = require('../../database/models/procurementrequest');
const { ProcurementBid, ProcurementRequest, Auction, ProcurementCategory, AuctionHistory  } = require('../../database/models');
const { Op } = require('sequelize');


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
                    as: 'procurementCategory'
                }]
            }]
    }]
    });

    const totalBidsCount = totalBids.length;

    // Get all procurement requests that have awarded status (some bid won)
    const awardedRequests = await ProcurementRequest.findAll({
    where: { status: 'awarded' },
    include: [
        {
            model: ProcurementBid,
            as: 'procurementBids',
            include: [
                {
                    model: Auction,
                    as: 'auction'
                }
            ]
        },
        {
            model: ProcurementCategory,
            as: 'procurementCategory'
        }
    ]
});



    let awardedBids = [];
    let awardedBidsByCategory = [];


    // For each awarded request, find the best bid and check if the seller made it (also extracts the awarded bids by category)
    for (const request of awardedRequests) {
        const bids = request.procurementBids;
        if (!bids || bids.length === 0) continue;

        const bestBid = bids.reduce((min, bid) => (bid.price < min.price ? bid : min), bids[0]);

        if (bestBid.seller_id === sellerId) {
            awardedBids.push(bestBid);

            const category = request.procurementCategory;
            if (category) {
                const categoryName = category.name;
                if (!awardedBidsByCategory[categoryName]) {
                    awardedBidsByCategory[categoryName] = 0;
                }
                awardedBidsByCategory[categoryName]++;
            }
        }
    }

    const awardedBidsCount = awardedBids.length;

    // Calculate the ratio of awarded bids to total bids made by the seller
    const ratio = totalBidsCount > 0 ? (awardedBidsCount / totalBidsCount) * 100 : 0;

    // Number of auctions the seller participated in (checks if bid associated with seller has auction_id)
    const totalAuction = await ProcurementBid.findAll({
        where: { 
            seller_id: sellerId, 
            auction_id: { [Op.ne] : null}
        }
    });

    const totalAuctionCount = totalAuction.length;
    let sumOfRatios = 0;

    // Find ratio of auction price to bid price for each auction
    for (const auction of totalAuction) {
        let ratioPerAuction = auction.auction_price / auction.price;
        sumOfRatios += ratioPerAuction;
    }

    let avgOfRatios = (sumOfRatios / totalAuctionCount) * 100;
    
    let avgPriceReduction = 100 - avgOfRatios;

    let submittedBidsByCategory = {};


    // Count total number of bids submitted by yhe seller for each category
    for (const bid of totalBids) {
        const category = bid.auction?.procurementRequest?.procurementCategory;
        if (!category) continue;

        const categoryName = category.name;
        if (!submittedBidsByCategory[categoryName]) {
            submittedBidsByCategory[categoryName] = 0;
        }
        submittedBidsByCategory[categoryName]++;
    }


    let submittedBidPercentages = {};
    let awardedBidPercentages = {};

    for (const category in submittedBidsByCategory) {
        submittedBidPercentages[category] = (submittedBidsByCategory[category] / totalBidsCount) * 100;
    }

    for (const category in awardedBidsByCategory) {
        awardedBidPercentages[category] = (awardedBidsByCategory[category] / awardedBidsCount) * 100;
    }


    // number of top 5 auction placements by position

    const top5AuctionPlacements = await ProcurementBid.findAll({
        where: { 
            seller_id: sellerId, 
            auction_id: { [Op.ne]: null },
            auction_placement: { [Op.between]: [1, 5] }
        },
        attributes: ['auction_placement']
    });

    const top5PositionsCount = {};

    for (const bid of top5AuctionPlacements) {
        const placement = bid.auction_placement;

        if (!top5PositionsCount[placement]) {
            top5PositionsCount[placement] = 0;
        }

        top5PositionsCount[placement]++;
    }

    // Get all auction history records for the logged in seller
    const auctionHistory = await AuctionHistory.findAll({
        order: [
            ['auction_id', 'ASC'],
            ['price_submitted_at', 'ASC'],
        ],
        attributes: ['auction_id', 'price', 'price_submitted_at', 'previous_position', 'new_position'],
    });

    // Group bids by auction_id
    const auctionBids = auctionHistory.reduce((acc, bid) => {
        if (!acc[bid.auction_id]) {
            acc[bid.auction_id] = [];
        }
        acc[bid.auction_id].push(bid);
        return acc;
    }, {});

    // Process each auction
    let result = [];
    for (const auction_id in auctionBids) {
        const bids = auctionBids[auction_id];
        // Find the first bid (initial bid)
        const sortedBids = [...bids].sort((a, b) => new Date(a.price_submitted_at) - new Date(b.price_submitted_at));
        const firstBid = sortedBids[0];

        if (firstBid) {
            const firstBidPrice = firstBid.price;


            let averages = [];
            const bidsNumber = sortedBids.length;

            for (let i = 0; i < bidsNumber; i++) {

                // Compute the price reduction for each bid in regards to the first bid
                const columnAverage = 100 - (sortedBids[i].price / firstBidPrice * 100);
                averages.push({ bid_number: i, price_reduction: columnAverage });
            }

            result.push({ auction_id, averages });
        }
    }

    result.push({ auction_id: "AVERAGE PRICE REDUCTION PER BID", averages: [] });
    console.log(result[1].averages.length);
    for (let i = 0; i < result.length; i++) {
        let avg_price_reduction = 0;
        for (let j = 0; j < result[i].averages.length; j++) {
            avg_price_reduction += result[i].averages[j].price_reduction;
        }
        avg_price_reduction /= result[i].averages.length;
        result[result.length - 1].averages.push({ bid_number: i, price_reduction: avg_price_reduction });
    }


    

    return {
        totalBidsCount,
        awardedBidsCount,
        awardedToSubmittedRatio: ratio.toFixed(2),
        avgPriceReduction: avgPriceReduction.toFixed(2),
        submittedBidPercentages,
        awardedBidPercentages,
        top5PositionsCount,
        priceReductionsOverTime: result
    }
}
