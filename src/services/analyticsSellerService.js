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

 // Step 1: Fetch auction history data, sorting each auction's bids by price_submitted_at
    const auctionHistory = await AuctionHistory.findAll({
        include: [
            {
                where: {
                    seller_id: sellerId,
                    auction_id: { [Op.ne]: null }
                },
                model: ProcurementBid,
                as: 'bid',  // Join ProcurementBid to get the price
                attributes: ['price', 'auction_id', 'price_submitted_at'],
            }
        ],
        order: [
            ['auction_id', 'ASC'],
            ['price_submitted_at', 'ASC']
        ]
    });

    // Group auction history by auction_id
    const auctionGroups = auctionHistory.reduce((groups, record) => {
        const { auction_id, bid, price_submitted_at, previous_position, new_position } = record;
        if (!groups[auction_id]) {
            groups[auction_id] = [];
        }
        groups[auction_id].push({
            bidPrice: bid.price,
            position: new_position,
            priceSubmittedAt: price_submitted_at
        });
        return groups;
    }, {});

    let priceReductions = [];
    let columnCount = 0;

    // Step 2: Calculate price reduction for each auction
    for (let auctionId in auctionGroups) {
        const auctionBids = auctionGroups[auctionId];

        // Sort the auction bids based on the position (from 0, 1, 2, ...)
        auctionBids.sort((a, b) => a.position - b.position);

        const referencePrice = auctionBids[0].bidPrice; // The initial bid (position 0)
        let reductions = [];

        // Calculate the reduction values for each bid
        auctionBids.forEach((bid, index) => {
            const reductionPercentage = (bid.bidPrice / referencePrice) * 100;
            reductions.push(reductionPercentage);
        });

        // For each position, calculate the average reduction percentage
        reductions.forEach((reduction, index) => {
            if (!priceReductions[index]) {
                priceReductions[index] = {
                    columnIndex: index,
                    totalReduction: 0,
                    count: 0
                };
            }
            priceReductions[index].totalReduction += reduction;
            priceReductions[index].count += 1;
        });

        columnCount = Math.max(columnCount, reductions.length);
    }

    // Step 3: Calculate the average percentage for each column
    priceReductions.forEach((column) => {
        column.averagePercentage = column.totalReduction / column.count;
    });

    // Return the results
    priceReductions = priceReductions.map((column) => ({
        columnIndex: column.columnIndex,
        averagePercentage: column.averagePercentage
    }));
    

    return {
        totalBidsCount,
        awardedBidsCount,
        awardedToSubmittedRatio: ratio.toFixed(2),
        avgPriceReduction: avgPriceReduction.toFixed(2),
        submittedBidPercentages,
        awardedBidPercentages,
        top5PositionsCount,
        priceReductionsOverTime: priceReductions
    }
}
