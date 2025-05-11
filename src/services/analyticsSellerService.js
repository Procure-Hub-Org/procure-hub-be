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
            }],
            model: ProcurementRequest,
            as: 'procurementRequest',
            include: [{
                model: ProcurementCategory,
                as: 'procurementCategory'
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

        const bestBid = bids.reduce((min, bid) => (bid.auction_price < min.auction_price ? bid : min), bids[0]);

        if (bestBid.seller_id == sellerId) {
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
        const category = bid.procurementRequest?.procurementCategory;
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
        include: [
        {
            model: ProcurementBid,
            as: 'bid',
            attributes: [], // exclude bid fields from result
            where: {
                seller_id: sellerId, // filter by logged-in seller's ID
            },
            required: true // ensures only matching bids are included
        }
    ]
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
                const columnAverage = (sortedBids[i].price / firstBidPrice * 100);
                averages.push({ bid_number: i, price_reduction: columnAverage });
            }

            result.push({ auction_id, averages });
        }
    }


    result.push({ section: "Average bid reductions per bid iteration accross all auctions", averages: [] });
    const lastIndex = result.length - 1;

    // Calculate the maximum bid number across all auctions
    const maxBidNumber = Math.max(...result.slice(0, lastIndex).map(auction => 
        auction.averages.length > 0 ? 
        Math.max(...auction.averages.map(bid => bid.bid_number)) : -1
    ));

    // For each bid number (0, 1, 2, etc.), calculate the average price reduction across all auctions
    for (let bidNum = 0; bidNum <= maxBidNumber; bidNum++) {
        let totalReduction = 0;
        let count = 0;
  
        // Go through all auctions (except the last one which is the average we're calculating)
        for (let i = 0; i < lastIndex; i++) {
            // Find the bid with this bid number in the current auction
            const bidData = result[i].averages.find(bid => bid.bid_number === bidNum);
            if (bidData) {
                totalReduction += bidData.price_reduction;
                count++;
            }
        }
        // Add the average for this bid number to the results
        if (count > 0) {
            const avgReduction = totalReduction / count;
            result[lastIndex].averages.push({ 
                column_index: bidNum, 
                average_value_in_percentage: avgReduction 
        });
        }
    }

    // Return only the last row of the result
    const averagePriceReductionOverTime = result.at(-1).averages;
    
    return {
        totalBidsCount,
        awardedBidsCount,
        awardedToSubmittedRatio: ratio.toFixed(2),
        avgPriceReduction: avgPriceReduction.toFixed(2),
        submittedBidPercentages,
        awardedBidPercentages,
        top5PositionsCount,
        averagePriceReductionOverTime
    }
}
