const procurementrequest = require('../../database/models/procurementrequest');
const { ProcurementBid, ProcurementRequest, Auction, ProcurementCategory  } = require('../../database/models');

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
        as: 'bids',
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
    }]
});


    let awardedBids = [];
    let awardedBidsByCategory = {};

    // For each awarded request, find the best bid and check if the seller made it (also extracts the awarded bids by category)
    for (const request of awardedRequests) {
        const bids = request.bids;
        if (!bids || bids.length === 0) continue;

        const bestBid = bids.reduce((min, bid) => (bid.price < min.price ? bid : min), bids[0]);
    
        if (bestBid.seller_id === sellerId) {
            awardedBids.push(bestBid);

            const category = bestBid.auction?.procurementRequest?.category;
            if (category) {
                const categoryName = category.name;
                if (!awardedBidsByCategory[categoryName]) {
                    awardedBidsByCategory[categoryName] = 0;
                }
                awardedBidsByCategory[categoryName]++;
            }
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


    const submittedBidPercentages = {};
    const awardedBidPercentages = {};

    for (const category in submittedBidsByCategory) {
        submittedBidPercentages[category] = (submittedBidsByCategory[category] / totalSubmitted) * 100;
    }

    for (const category in awardedBidsByCategory) {
        awardedBidPercentages[category] = (awardedBidsByCategory[category] / totalAwarded) * 100;
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

    // Price reduction over time
    const allHistories = await AuctionHistory.findAll({
        include: {
            model: ProcurementBid,
            as: 'bid',
            attributes: ['auction_price'],
        },
        order: [['price_submitted_at', 'ASC']],
        raw: true,
        nest: true,
    });

    // Group by auction_id
    const groupedByAuction = {};
    for (const history of allHistories) {
        const auctionId = history.auction_id;
        if (!groupedByAuction[auctionId]) {
            groupedByAuction[auctionId] = [];
        }
        groupedByAuction[auctionId].push(history);
    }

    const reductionMatrix = [];

    //
    for (const auctionId in groupedByAuction) {
        const entries = groupedByAuction[auctionId];

        // Ensure entries are sorted by time
        entries.sort((a, b) => new Date(a.price_submitted_at) - new Date(b.price_submitted_at));

        const row = [];
        const initialPrice = entries[0]?.bid?.auction_price;

        if (!initialPrice || initialPrice === 0) continue;

        for (const entry of entries) {
            const price = entry.bid?.auction_price;
            if (!price || price === 0) continue;

            row.push(price / initialPrice);
        }

        if (row.length > 0) {
            reductionMatrix.push(row);
        }
    }

    // Calculate average by column index
    const columnSums = {};
    const columnCounts = {};

    for (const row of reductionMatrix) {
        row.forEach((value, index) => {
            if (!columnSums[index]) {
                columnSums[index] = 0;
                columnCounts[index] = 0;
            }

            columnSums[index] += value;
            columnCounts[index] += 1;
        });
    }

    const reductionMatrixResult = [];

    for (const index in columnSums) {
        const avg = (columnSums[index] / columnCounts[index]) * 100;
        reductionMatrixResult.push([parseInt(index), avg]);
    }

    // Sort by column index
    reductionMatrixResult.sort((a, b) => a[0] - b[0]);

    return {
        totalBidsCount,
        awardedBidsCount,
        ratio,
        totalAuctionCount,
        avgOfRatios,
        avgPriceReduction,
        submittedBidPercentages,
        awardedBidPercentages,
        top5PositionsCount,
        reductionMatrixResult,
    }
}
