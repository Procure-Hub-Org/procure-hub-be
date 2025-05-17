const db = require('../../database/models');
const { Dispute, Contract } = db;

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
    if (contract.buyer_id !== user_id && contract.seller_id !== user_id) {
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
      complainant_id: user_id,
      complainment_text,
      status: 'pending',
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