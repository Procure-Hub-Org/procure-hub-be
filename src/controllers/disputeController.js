const {
    Dispute,
    Contract,
    ProcurementRequest,
    ProcurementBid,
    User } = require('../../database/models');

// vraca disputes za userov contracts sa datim id
const getDisputesOfContract = async (req, res) => {
    const { contractId } = req.params;
    const user = req.user;

    try {
        // contract sa datim id
        const contract = await Contract.findByPk(contractId, {
            include: [
                {
                    model: ProcurementRequest,
                    as: 'procurementRequest',
                    attributes: ['buyer_id'],
                },
                {
                    model: ProcurementBid,
                    as: 'bid',
                    attributes: ['seller_id'],
                }
            ]
        });

        // ako ne postoji contract sa datim id
        if (!contract) { return res.status(404).json({ message: 'Contract not found' }) }

        const buyerId = contract.procurementRequest.buyer_id;
        const sellerId = contract.bid.seller_id;

        // formiranje filtera za diputes prema rolama
        let filterDispute = {
            contract_id: contractId
        };

        if (user.role !== 'admin') {

            // buyer vidi dispute koje je seller napravio
            if (user.id === buyerId) {
                filterDispute.user_id = sellerId;
            }
            // seller vidi dispute koje je buyer napravio
            else if (user.id === sellerId) {
                filterDispute.user_id = buyerId;
            }
            else {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        // dobavljanje disputes
        const disputes = await Dispute.findAll({
            where: filterDispute,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'company_name']
                }
            ]
        });

        // forimarnje odgovora
        const response = disputes.map(d => ({
            id: d.id,
            buyer_name: d.user.id === buyerId ? `${d.user.first_name} ${d.user.last_name}` : null,
            buyer_company_name: d.user.id === buyerId ? d.user.company_name : null,
            seller_name: d.user.id === sellerId ? `${d.user.first_name} ${d.user.last_name}` : null,
            seller_company_name: d.user.id === sellerId ? d.user.company_name : null,
            complainment_text: d.complainment_text
        }));

        return res.json(response);

    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};


// Create a new dispute
const createDispute = async (req, res) => {
  try {
    console.log('Received dispute creation request:', req.body);

    const { contract_id, complainment_text } = req.body;
    const user_id = req.user.id;

    console.log(`User ID: ${user_id}, Contract ID: ${contract_id}`);
    console.log("User status from req.user:", `"${req.user.status}"`);
    // Verify user is active
    if (req.user.status !== 'active') {
      console.log('User account is not active');
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact support.' 
      });
    }

    // Validate required fields
    if (!contract_id || !complainment_text) {
      console.log('Missing contract_id or complainment_text:', { contract_id, complainment_text });
      return res.status(400).json({
        message: 'Contract ID and complainment text are required'
      });
    }

    // Check if the contract exists
    const contract = await Contract.findByPk(contract_id);
    if (!contract) {
      console.log(`Contract with ID ${contract_id} not found`);
      return res.status(404).json({
        message: 'Contract not found'
      });
    }
    console.log(`Contract found:`, contract);

    // Get full contract details with procurement and bid
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

    console.log('Full contract details:', fullContract);

    const buyerId = fullContract.procurementRequest?.buyer_id;
    const sellerId = fullContract.bid?.seller_id;

    console.log(`Buyer ID: ${buyerId}, Seller ID: ${sellerId}`);

    // Check authorization
    if (user_id !== buyerId && user_id !== sellerId) {
      console.log('User is not authorized to create dispute for this contract');
      return res.status(403).json({
        message: 'You are not authorized to create a dispute for this contract'
      });
    }
    {/*}
    // Check if dispute already exists
    const existingDispute = await Dispute.findOne({ where: { contract_id } });
    if (existingDispute) {
      console.log('Dispute already exists for this contract');
      return res.status(400).json({
        message: 'A dispute for this contract already exists'
      });
    }
    */}

    // Create the dispute
    const newDispute = await Dispute.create({
      contract_id,
      user_id,
      complainment_text
    });

    console.log('Dispute created successfully:', newDispute);

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

module.exports = {
  getDisputesOfContract,
  createDispute 
};
