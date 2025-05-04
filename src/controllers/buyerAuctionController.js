const { ProcurementBid, Auction } = require('../../database/models');

const createAuction = async (req, res) => {
  try {
    const {
      procurement_id,
      starting_time,
      duration,
      min_bid_increment,
      last_call_timer
    } = req.body;

    const existingAuction = await Auction.findOne({
      where: { procurement_request_id: procurement_id }
    });

    if (existingAuction) {
      return res.status(400).json({
        error: "Auction already exists for this procurement request"
      });
    }

    const start = new Date(starting_time);
    const ending_time = new Date(start.getTime() + duration * 60000);

    const newAuction = await Auction.create({
      procurement_request_id: procurement_id,
      starting_time: start.toISOString(),
      duration,
      min_increment: min_bid_increment,
      last_call_timer,
      ending_time: ending_time.toISOString()
    });

    const bids = await ProcurementBid.findAll({
      where: { procurement_request_id: procurement_id },
      order: [['price', 'ASC']]
    });

    // Dodjela auction_id i auction_placement po rastućim cijenama
    const sortedBids = [...bids].sort((a, b) => a.price - b.price);
    for (let i = 0; i < sortedBids.length; i++) {
      await sortedBids[i].update({
        auction_id: newAuction.id,
        auction_placement: i + 1
      });
    }

    return res.status(201).json({
      message: "Auction created and bids updated",
      auction: newAuction
    });
  } catch (error) {
    console.error("Error creating auction:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createAuction
};
