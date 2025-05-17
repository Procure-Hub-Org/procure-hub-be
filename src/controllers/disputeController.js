const db = require('../../database/models');
const { Dispute, Contract, ProcurementRequest, ProcurementBid } = db;

// Create a new dispute
exports.createDispute = async (req, res) => {
  try {
    const { contract_id, complainment_text } = req.body;
    const user_id = req.user.id;
    
    // Verify user is active
    if (req.user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact support.' 
      });
    }
    
    // Validate required fields
    if (!contract_id || !complainment_text) {
      return res.status(400).json({
        message: 'Contract ID and complainment text are required'
      });
    }
    
    // Check if the contract exists
    const contract = await Contract.findByPk(contract_id);
    if (!contract) {
      return res.status(404).json({
        message: 'Contract not found'
      });
    }
    
    // Check if user is a party to this contract (either buyer or seller)
    // First, get the full contract details with associated procurement and bid
    const fullContract = await Contract.findByPk(contract_id, {
    include: [
        {
        model: ProcurementRequest,
        as: 'procurementRequest',
        attributes: ['buyer_id']
        },
        {
        model: ProcurementBid,
        as: 'bid',
        attributes: ['seller_id']
        }
    ]
    });

    // Now check if the user is either the buyer or seller
    const buyerId = fullContract.procurementRequest.buyer_id;
    const sellerId = fullContract.bid.seller_id;

    if (user_id !== buyerId && user_id !== sellerId) {
    return res.status(403).json({
        message: 'You are not authorized to create a dispute for this contract'
    });
    }
    
    // Check if a dispute for this contract already exists
    const existingDispute = await Dispute.findOne({
      where: { contract_id }
    });
    
    if (existingDispute) {
      return res.status(400).json({
        message: 'A dispute for this contract already exists'
      });
    }
    
    // Create the new dispute
    const newDispute = await Dispute.create({
        contract_id,
        user_id: user_id,  // Changed from complainant_id to user_id to match model
        complainment_text,
        created_at: new Date(),
        updated_at: new Date()
    });
    
    return res.status(201).json({
      message: 'Dispute created successfully',
      dispute: {
        id: newDispute.id,
        contract_id: newDispute.contract_id,
        status: newDispute.status
      }
    });
    
  } catch (error) {
    console.error('Error creating dispute:', error);
    return res.status(500).json({ 
      message: 'Something went wrong', 
      error: error.message 
    });
  }
};