const { ProcurementBid, Auction, ProcurementRequest, User } = require('../../database/models');

const getBuyerDashboard = async (userId) => {

  // Vraća sve aukcije vezane za zahtjeve koje je ovaj buyer kreirao
  const auctions = await Auction.findAll({
    include: [
      {
        model: ProcurementRequest,
        as: 'procurementRequest',
        where: { buyer_id: userId }, // SAMO ZA OVOG BUYERA
        attributes: ['title'],
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['first_name', 'last_name', 'email']
          }
        ]
      }
    ],
    attributes: ['id', 'starting_time', 'duration', 'min_increment', 'last_call_timer', 'ending_time'],
    distinct: true
  });

  const now = new Date();
  const enhanced = [];

  for (const auction of auctions) {
    const auctionData = auction.get({ plain: true });

    let status = 'active';
    if (now < auction.starting_time) {
      status = 'to_be';
    } else if (now > auction.ending_time) {
      status = 'happened';
    }

    let winningBidInfo = null;

    if (status === 'happened') {
      const winningBid = await ProcurementBid.findOne({
        where: {
          auction_id: auction.id,
          auction_placement: 1
        },
        include: [
          {
            model: User,
            as: 'seller',
            attributes: ['first_name', 'last_name', 'company_name']
          }
        ]
      });

      if (winningBid) {
        winningBidInfo = {
          auction_price: winningBid.auction_price,
          sellerName: `${winningBid.seller.first_name} ${winningBid.seller.last_name}`,
          sellerCompany: winningBid.seller.company_name
        };
      }
    }

    enhanced.push({
      ...auctionData,
      status,
      winningBid: winningBidInfo
    });
  }

  return enhanced;
};

module.exports = { getBuyerDashboard };