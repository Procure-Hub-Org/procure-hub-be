const { ProcurementBid, ProcurementRequest, User } = require('../../database/models');

// get all bids by a seller with related procurement request and buyer details
const getSellerBids = async (req, res) => {

    try {
        const userId = req.params.userId;
    
        const userBids = await ProcurementBid.findAll({

          where: { seller_id: userId },
          attributes: ['id', 'price', 'timeline', 'proposal_text', 'submitted_at','auction_price'],
          include: [
            {
              model: ProcurementRequest,
              as: 'procurementRequest',
              attributes: ['title', 'bid_edit_deadline', 'deadline'],
              include: [
                {
                  model: User,
                  as: 'buyer',
                  attributes: ['first_name', 'last_name', 'company_name'],
                },
              ]
            },
          ],
          order: [['submitted_at', 'DESC']],
        });
    
        res.status(200).json(userBids);
      } 

      catch (error) {
        console.error('Error fetching user bids:', error);
        res.status(500).json({ message: 'Failed to fetch bids' });
      }
    };

module.exports = { getSellerBids };