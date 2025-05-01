const { Auction, ProcurementBid, User } = require('../models');

const getLiveAuctionData = async (auctionId) => {
    const auction = await Auction.findOne({
        where: { id: auctionId },
        attributes: ['ending_time'],
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
                    }
                ],
                order: [['auction_placement', 'ASC']]
            }
        ]
    });

    if (!auction) {
        throw new Error('Auction not found');
    }

    const sortedBids = auction.bids.sort((a, b) => a.auction_placement - b.auction_placement);

    return {
        ending_time: auction.ending_time,
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
