const { AuctionHistory, Auction, ProcurementBid, User } = require('../../database/models');

const getAuctionHistory = async (req, res) => {
  const auctionId = req.params.id;
  const userRole = req.user.role;

  try {
    const historyLogs = await AuctionHistory.findAll({
      where: { auction_id: auctionId },
      attributes: ['previous_position', 'new_position', 'price_submitted_at'],
      include: [
        {
          model: ProcurementBid,
          as: 'bid',
          attributes: ['price'],
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['first_name', 'last_name', 'company_name'],
            },
          ],
        },
      ],
      order: [['price_submitted_at', 'DESC']],
    });

     let filteredLogs = historyLogs;

    if (userRole === 'seller') {
      const currentSeller = req.user.name;
      filteredLogs = historyLogs.filter(
        log =>
          `${log.bid.seller.first_name} ${log.bid.seller.last_name}` ===
          currentSeller
      );
    } else if (userRole !== 'admin' && userRole !== 'buyer') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    const mappedLogs = historyLogs.map(log => ({
      timestamp: log.price_submitted_at,
      sellerName: `${log.bid.seller.first_name} ${log.bid.seller.last_name}`,
      sellerCompany: log.bid.seller.company_name,
      bidAmount: log.bid.price,
      previousPosition: log.previous_position,
      newPosition: log.new_position,
    }));

    res.json(mappedLogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching auction history', error: err.message });
  }
};

module.exports = { getAuctionHistory };




