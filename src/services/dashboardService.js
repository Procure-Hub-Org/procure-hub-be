const { ProcurementBid, Auction, ProcurementRequest, User } = require('../../database/models');

/* Seller 
Gotove aukcije (status: happened) - aukcije info, procurement request info, winning bid cijena i ime
Aktiven aukcije (status: avtive) - aukcije info, procurement request info, seller auction bid i placement
Zakazane aukcije (status: to_be) - aukcije info, procurement request info
*/
const getSellerDashboard = async (userId) => {

  // Vraca info o aukcijama (za ciji procurement request je seller dao ponudu),
  // procurement info, 
  // buyer info 
  const auctions = await Auction.findAll({
    include: [
      {
        model: ProcurementBid,
        as: 'bids',
        where: { seller_id: userId },
        required: true, 
        attributes: [],
      },
      {
        model: ProcurementRequest,
        as: 'procurementRequest',
        attributes: ['title'],
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['first_name', 'last_name', 'email'],
          },
        ],
      },
    ],
    attributes: ['id', 'starting_time', 'duration', 'min_increment', 'last_call_timer', 'ending_time'],
    distinct: true, 
  });


  // Odredivanje statusa vracenih aukcija na osovu starting_time i ending_time

  const now = new Date();
  console.log(now);
  const enhanced = [];

  for (const auction of auctions) {
    
    const auctionData = auction.get({ plain: true });
    
    let status = 'active';
    if (now < auction.starting_time) { status = 'to_be'; } 
    else if (now > auction.ending_time) { status = 'happened'; }
    
    // Na osnovu statusa se vraca trenutni ili ukupni plasman za sellera
    let relevantBids = [];
    
    if (status === 'active' || status === 'happened') {
      const sellerBids = await ProcurementBid.findAll({
        where: {
          auction_id: auction.id,
          seller_id: userId
        },
        attributes: ['auction_price', 'auction_placement', 'submitted_at']
      });
  
      relevantBids = sellerBids.map(bid => bid.get({ plain: true }));
    }

  
    // sastavljanje u jedan odgovor
    enhanced.push({
      ...auctionData,
      status,
      relevantBids
    });
  }

  return enhanced;
};

// Buyer  
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

// Admin
// Vraća sve aukcije sa svim relevantnim informacijama (procurement request, buyer, seller)  

const getAdminDashboard = async () => {
  const auctions = await Auction.findAll({
    include: [
      {
        model: ProcurementRequest,
        as: 'procurementRequest',
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



module.exports = { getBuyerDashboard,getAdminDashboard,getSellerDashboard};

