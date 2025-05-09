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



const getRequestIdsWithMyBids = async (req, res) => {
      try {
          const sellerId = req.user.id;
  
          const bids = await ProcurementBid.findAll({
              where: { seller_id: sellerId },
              attributes: ['procurement_request_id'],
              group: ['procurement_request_id']
          });
  
          const requestIds = bids.map(bid => bid.procurement_request_id);
  
          return res.status(200).json({ requestIds });
      } catch (error) {
          console.error('Error fetching seller bid request IDs:', error);
          return res.status(500).json({ message: 'Internal server error' });
      }
  };

module.exports = { getSellerBids, getRequestIdsWithMyBids };