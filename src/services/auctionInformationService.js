const { Auction, ProcurementBid, ProcurementRequest, User } = require('../../database/models');

const getLiveAuctionData = async (auctionId) => {
    const auction = await Auction.findOne({
        where: { id: auctionId },
        attributes: ['ending_time', 'last_call_timer', 'min_increment'],
        include: [
            {
                model: ProcurementBid,
                as: 'bids',
                attributes: ['id', 'auction_price', 'auction_placement'],
                include: [
                    {
                        model: User,
                        as: 'seller',
                        attributes: ['id', 'first_name', 'last_name', 'company_name']
                    },
                    {
                        model: ProcurementRequest,
                        as: 'procurementRequest',
                        attributes: ['title'],
                        include: [
                            {
                                model: User,
                                as: 'buyer',
                                attributes: ['id', 'first_name', 'last_name', 'company_name']
                            }
                        ]
                    }
                ]
            }
        ]
    });

    if (!auction) {
        throw new Error('Auction not found');
    }

    const sortedBids = auction.bids.sort((a, b) => a.auction_placement - b.auction_placement);

    return {
        ending_time: auction.ending_time,
        last_call_timer_seconds: auction.last_call_timer * 60,
        min_increment: auction.min_increment,
        sellers: sortedBids.map((bid) => ({
            seller: bid.seller,
            auction_price: bid.auction_price,
            auction_placement: bid.auction_placement
        })),
        buyer: auction.bids[0]?.procurementRequest?.buyer || null,
        procurementRequest: auction.bids[0]?.procurementRequest || null,
        title: auction.bids[0]?.procurementRequest?.title || null,
    };
};

module.exports = {
    getLiveAuctionData
};
