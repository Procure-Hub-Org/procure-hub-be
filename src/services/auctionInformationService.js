const { Auction, ProcurementRequest, ProcurementBid, User } = require('../../database/models');

const getLiveAuctionData = async (auctionId) => {
    const auction = await Auction.findOne({
        where: { id: auctionId },
        attributes: ['ending_time', 'last_call_timer', 'min_increment', 'procurement_request_id']
    });

    if (!auction) {
        throw new Error('Auction not found');
    }

    const procurementRequest = await ProcurementRequest.findOne({
        where: { id: auction.procurement_request_id },
        attributes: ['id', 'title', 'buyer_id'],
        include: [
            {
                model: User,
                as: 'buyer',
                attributes: ['id', 'first_name', 'last_name', 'company_name']
            }
        ]
    });

    if (!procurementRequest) {
        throw new Error('Procurement request not found');
    }
    const bids = await ProcurementBid.findAll({
        where: { procurement_request_id: procurementRequest.id },
        attributes: ['id', 'auction_price', 'auction_placement', 'seller_id'],
        include: [
            {
                model: User,
                as: 'seller',
                attributes: ['id', 'first_name', 'last_name', 'company_name']
            }
        ]
    });
    
    console.log('BIDS:', JSON.stringify(bids, null, 2));
    

    const sortedBids = bids.sort((a, b) => a.auction_placement - b.auction_placement);

    return {
        ending_time: auction.ending_time,
        last_call_timer: auction.last_call_timer,
        min_increment: auction.min_increment,
        procurement_request_title: procurementRequest.title,
        buyer: procurementRequest.buyer,
        sellers: sortedBids.map((bid) => ({
            seller: bid.seller,
            auction_price: bid.auction_price,
            auction_placement: bid.auction_placement
        }))
    };
};

module.exports = {
    getLiveAuctionData
};
