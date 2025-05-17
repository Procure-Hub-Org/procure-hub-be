const { ProcurementBid, ProcurementRequest, User } = require('../../database/models');
const bidDocumentService = require('../services/bidDocumentService');

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


const getProcurementBidById = async (req, res) => {
  try {
    const bidId = req.params.id;
    const bid = await ProcurementBid.findByPk(req.params.id, {
    attributes: ['id', 'price', 'timeline', 'proposal_text', 'submitted_at', 'auction_price'],
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
      {
        model: BidDocument,
        as: 'bidDocuments', 
        attributes: ['id', 'original_name', 'file_path', 'file_type'],
      }
    ]
  });


    if (!bid) {
      return res.status(404).json({ success: false, message: 'Bid not found' });
    }

    const documents = await bidDocumentService.getBidDocumentsByProcurementBidId(bidId);

    const b = bid.get({ plain: true });
    const response = {
      id:            b.id,
      requestTitle:  b.procurementRequest.title,
      deadline:      b.procurementRequest.deadline,
      sellerName:    `${b.seller.first_name} ${b.seller.last_name}`,
      company:       b.seller.company_name,
      offerPrice:    b.price,
      auctionPrice:  b.auction_price,
      placement:     b.auction_placement,
      submittedAt:   b.submitted_at,
      timeline:    b.timeline,
      proposalText:  b.proposal_text,
      documents      
    };

    return res.status(200).json({ success: true, data: response });
  }
  catch (err) {
    console.error('Error fetching bid by ID:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


module.exports = { getSellerBids, getRequestIdsWithMyBids, getProcurementBidById};