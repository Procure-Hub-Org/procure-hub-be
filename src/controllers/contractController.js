const {
  Contract,
  ProcurementRequest,
  ProcurementBid,
  User,
  PaymentInstruction,
  ContractLog,
  Notification,
  Sequelize,
  Dispute,
  ProcurementCategory,
} = require('../../database/models');
const { Op, where } = require('sequelize');
const path = require('path');

const { sendMail } = require('../services/mailService'); 
const { generateContractIssuedEmailHtml } = require('../utils/templates/emailTemplates');
const { generateContractSignedEmailHtml } = require('../utils/templates/emailTemplates');

const contractDocumentService = require('../services/contractDocumentService');

// Get all logs for a specific contract (admin only)
const getContractLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact support.' 
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    // Check if contract exists - MODIFIED to only request existing columns
    const contract = await Contract.findByPk(id, {
      attributes: ['id', 'procurement_request_id', 'bid_id', 'status', 'price', 'created_at', 'updated_at'],
      // Only request columns that actually exist in the database
    });

    if (!contract) {
      return res.status(404).json({ 
        message: 'Contract not found' 
      });
    }

    // Get all logs for this contract
    const logs = await ContractLog.findAll({
      where: { contract_id: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'company_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      message: 'Contract logs retrieved successfully',
      logs
    });

  } catch (error) {
    console.error('Error fetching contract logs:', error);
    return res.status(500).json({ 
      message: 'Something went wrong', 
      error: error.message 
    });
  }
};

const createContract = async (req, res) => {
  try {
    const { procurement_request_id, bid_id, status, payment_instructions } = req.body;

    if (!procurement_request_id || !bid_id || !status) {
      return res.status(400).json({ message: 'Missing required fields: procurement_request_id, bid_id, status' });
    }

    if (!['issued', 'draft'].includes(status)) {
      return res.status(400).json({ message: 'Invalid contract status. Must be "issued" or "draft".' });
    }

    const procurementRequest = await ProcurementRequest.findByPk(procurement_request_id);
    if (!procurementRequest) {
      return res.status(404).json({ message: 'Procurement request not found' });
    }

    if (procurementRequest.buyer_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to award this procurement request' });
    }

    if (procurementRequest.status !== 'closed') {
      return res.status(400).json({ message: 'Only closed procurement requests can be awarded' });
    }

    const bid = await ProcurementBid.findByPk(bid_id);
    if (!bid || bid.procurement_request_id !== procurement_request_id) {
      return res.status(400).json({ message: 'Invalid bid or bid does not belong to the given procurement request' });
    }

    const existingContract = await Contract.findOne({
      where: {
        bid_id,
        procurement_request_id,
      },
    });
    if (existingContract) {
      return res.status(400).json({
        message: 'A contract already exists for this bid and procurement request.',
      });
    }

    // Kreiraj ugovor
    const contract = await Contract.create({
      procurement_request_id,
      bid_id,
      status,
      price: req.body.price,
      timeline: req.body.timeline,
    });

    // Kreiraj instrukcije za plaćanje
    if (payment_instructions && Array.isArray(payment_instructions.payments)) {
      for (const instr of payment_instructions.payments) {
        await PaymentInstruction.create({
          contract_id: contract.id,
          payment_policy: payment_instructions.policy || null,
          date: instr.date,
          amount: instr.amount,
        });
      }
    }

    // Loguj status
    await ContractLog.create({
      contract_id: contract.id,
      action: status === 'issued' ? 'Contract issued' : 'Contract saved as draft',
      user_id: req.user.id,
    });

    // Ažuriraj status zahtjeva
    procurementRequest.status = 'awarded';
    await procurementRequest.save();

    if (status === 'issued') {
      // Notifikacija za seller-a
      const seller = await User.findByPk(bid.seller_id);
      if (seller) {
        await Notification.create({
          contract_id: contract.id,
          user_id: seller.id,
          text: `Contract has been issued for your bid.`,
        });

       if (status === 'issued') {
  // Pribavi potrebne podatke za email
  const seller = await User.findByPk(bid.seller_id);
  const buyer = await User.findByPk(procurementRequest.buyer_id);

  // Pripremi podatke za email template
  const paymentInstructions = await PaymentInstruction.findAll({ where: { contract_id: contract.id } });
  const schedule = paymentInstructions.map(instr => ({
    date: instr.date.toISOString().split('T')[0],  // formatiraj datum npr. yyyy-mm-dd
    amount: instr.amount,
  }));

  const policy = paymentInstructions.length > 0 ? paymentInstructions[0].payment_policy : 'N/A';

  if (seller) {
    const html = generateContractIssuedEmailHtml({
      seller,
      buyer,
      requestTitle: procurementRequest.title || 'N/A',
      price: req.body.price,
      timeline: req.body.timeline,
      policy,
      schedule,
      logoCid: 'logoImage'
    });

    // Pošalji mail selleru
    await sendMail({
      to: seller.email,
      subject: 'Contract Issued for Your Bid',
      html: html,
      text: `Dear ${seller.first_name}, a contract has been issued for your bid. Please check your dashboard for details.`,
        attachments: [
                     {
                         filename: 'logo.png',
                         path: path.join(__dirname, '../../public/logo/logo-no-background.png'), // Path to the image file
                         cid: 'logoImage', // this must match the one used in <img src="cid:...">   
                         contentDisposition: 'inline', // Ensure the image is displayed inline	 
                     }
                 ],
    });
  }

}
 }

      // Notifikacija za admina
      const admins = await User.findAll({ where: { role: 'admin' } });
      for (const admin of admins) {
        await Notification.create({
          contract_id: contract.id,
          user_id: admin.id,
          text: `New contract has been issued.`,
        });
      }
    }

    return res.status(201).json({
      message: `Contract created with status "${status}"`,
      contract,
    });

  } catch (error) {
    console.error('Error creating contract:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
const updateContract = async (req, res) => {
  try {
    const { status, price, timeline, payment_instructions } = req.body;
    const contractId = req.params.id;

    const contract_previous_status = await Contract.findByPk(contractId, {
      attributes: ['status'],
    });

    if (!status || !['issued', 'draft', 'edited'].includes(status)) {
      return res.status(400).json({ message: 'Invalid contract status. Must be "issued", "edited" or "draft".' });
    }

    const contract = await Contract.findByPk(contractId);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    if (contract.status !== 'draft' && contract.status !== 'edited' && contract.status !== 'issued') {
      return res.status(400).json({ message: 'Only contracts with status "draft", "edited" and "issued" can be updated.' });
    }

    const procurementRequest = await ProcurementRequest.findByPk(contract.procurement_request_id);
    if (!procurementRequest) {
      return res.status(404).json({ message: 'Procurement request not found' });
    }

    if (procurementRequest.buyer_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this contract' });
    }

    const bid = await ProcurementBid.findByPk(contract.bid_id);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Ažuriraj osnovne podatke
    contract.status = status;
    contract.price = price || contract.price;
    contract.timeline = timeline || contract.timeline;
    await contract.save();

    // Očisti stare instrukcije ako postoje
    await PaymentInstruction.destroy({ where: { contract_id: contract.id } });

    // Kreiraj nove instrukcije za plaćanje ako su poslane
    if (payment_instructions && Array.isArray(payment_instructions.payments)) {
      for (const instr of payment_instructions.payments) {
        await PaymentInstruction.create({
          contract_id: contract.id,
          payment_policy: payment_instructions.policy || null,
          date: instr.date,
          amount: instr.amount,
        });
      }
    }

    // Loguj akciju
    await ContractLog.create({
      contract_id: contract.id,
      action: 'Contract updated (status: edited)',
      user_id: req.user.id,
    });

    // Ažuriraj status zahtjeva ako je ugovor izdan
    if (status === 'issued' || status === 'edited') {
      procurementRequest.status = 'awarded';
      await procurementRequest.save();

      const seller = await User.findByPk(bid.seller_id);

      if (seller) {
        // Kreiraj notifikaciju za seller-a
        await Notification.create({
          contract_id: contract.id,
          user_id: seller.id,
          text: `Contract has been issued for your bid.`,
        });

        // Pripremi podatke za email
        const buyer = await User.findByPk(procurementRequest.buyer_id);
        const paymentInstructions = await PaymentInstruction.findAll({ where: { contract_id: contract.id } });
        const schedule = paymentInstructions.map(instr => ({
          date: instr.date.toISOString().split('T')[0],
          amount: instr.amount,
        }));
        const policy = paymentInstructions.length > 0 ? paymentInstructions[0].payment_policy : 'N/A';

        const html = generateContractIssuedEmailHtml({
          seller,
          buyer,
          requestTitle: procurementRequest.title || 'N/A',
          price: contract.price,
          timeline: contract.timeline,
          policy,
          schedule,
          logoCid: 'logoImage',
        });

        await sendMail({
          to: seller.email,
          subject: 'Contract Issued for Your Bid',
          html,
          text: `Dear ${seller.first_name}, a contract has been issued for your bid.`,
          attachments: [
            {
              filename: 'logo.png',
              path: path.join(__dirname, '../../public/logo/logo-no-background.png'),
              cid: 'logoImage',
              contentDisposition: 'inline',
            },
          ],
        });
      }

      // Notifikacije za admine
      const admins = await User.findAll({ where: { role: 'admin' } });
      for (const admin of admins) {
        await Notification.create({
          contract_id: contract.id,
          user_id: admin.id,
          text: `New contract has been issued.`,
        });
      }
    }

    return res.status(200).json({
      message: `Contract successfully updated`,
      contract,
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


/* --- zajednicka logika za getContracts i getContractById funkcije ---*/
/* query parameters: email, 
                     status (of contract), 
                     date (exact date), 
                     start_date, end_date (contracts in range),
                     category (of request linked to contract) */
const fetchContracts = async ({ user, query, contractId = null }) => {
  const isAdmin = user.role === 'admin';

  // Formiranje filtera
  const filter = {};

  // filtrira rezultate prema rolama buyer/seller
  if (!isAdmin && contractId === null) {
    const roleFilter = [];

    // filtrira ugovore zavisno od role usera buyer ili seller
    // email query za buyer usera filtrira prema email sellera
    // email query za seller usera filtrira prema email buyera
    if (user.role === 'buyer') {
      roleFilter.push({ '$procurementRequest.buyer.id$': user.id });
      if (query.email) {
        roleFilter.push({ '$bid.seller.email$': query.email });
      }

    } else if (user.role === 'seller') {
      roleFilter.push({ '$bid.seller.id$': user.id });
      if (query.email) {
        roleFilter.push({ '$procurementRequest.buyer.email$': query.email });
      }
    }
    filter[Op.and] = roleFilter;
  }
  // filtrira po contract id
  if (contractId) { filter['id'] = contractId; }

  // filtriranje po datumu
  if (query.start_date || query.end_date) {
    filter['created_at'] = {};
    if (query.start_date) { filter['created_at'][Op.gte] = new Date(query.start_date); }
    if (query.end_date) { filter['created_at'][Op.lte] = new Date(query.end_date); }
  } 
  // ako zelimo tacan datum query parametar je "date"
  else if (query.date) { filter['created_at'] = { [Op.eq]: new Date(query.date) }; }

  // filter po kategoriji u koju spada procurement request
  if (query.category) {
    filter['$procurementRequest.procurementCategory.name$'] = query.category;
  }

  //filter po statusu ugovora
  if (query.status) { filter['status'] = query.status; }

  // Dobavljanje ugovora
  const contracts = await Contract.findAll({
    where: filter,
    include: [
      {
        model: ProcurementRequest, // vrati sve zahtjeve vezane za ugovor
        as: 'procurementRequest',
        attributes: ['id', 'title'],
        include: [
          {
            model: User, // info o vlasniku zahtjeva (buyer)
            as: 'buyer',
            attributes: ['id', 'first_name', 'last_name', 'company_name', 'email']
          },
          {
            model: ProcurementCategory, // kategorija zahtjeva
            as: 'procurementCategory',
            attributes: ['id', 'name']
          }
        ]
      },
      {
        model: ProcurementBid, // sve ponude vezane za ugovor
        as: 'bid',
        attributes: ['id', 'price', 'auction_price', 'timeline'],
        include: [
          {
            model: User, // info o vlasniku ponude (seller)
            as: 'seller',
            attributes: ['id', 'first_name', 'last_name', 'company_name', 'email']
          }
        ]
      },
      {
        model: Dispute,
        as: 'disputes',
        attributes: [],
      },
      {
        model: PaymentInstruction,  // uslovi za placanje
        as: 'paymentInstructions',
        attributes: ['id', 'payment_policy', 'date', 'amount']
      }
    ],
    attributes: {
      // broj disputes za ugovor
      include: [
        'id',
        'procurement_request_id',
        'bid_id',
        'status',
        'price',
        'timeline',
        'created_at',
        [Sequelize.fn('COUNT', Sequelize.col('disputes.id')), 'number_of_disputes']
      ],
    },
    group: [
      'Contract.id',
      'procurementRequest.id',
      'procurementRequest.buyer.id',
      'bid.id',
      'bid.seller.id',
      'procurementRequest.procurementCategory.id',
      'paymentInstructions.id'
    ]
  });

  // Formiranje odgovora
  const response = await Promise.all(contracts.map(async contract => {
    // dobavljanje dokumenta za ugovor
    const contractDocument = await contractDocumentService.getContractDocument(contract.id);

    return {
      //entire contract info
      contract: contract,
      //procuremnet request info
      procurementRequest: contract.procurementRequest,
      // bid info
      bid: contract.bid,
      // contract details
      contract_id: contract.id,
      award_date: contract.dataValues.created_at,
      price: contract.price,
      delivery_terms: contract.timeline,
      status: contract.status,
      contract_document_url: contractDocument?.file_url || null,
      contract_document_name: contractDocument?.original_name || null,
      number_of_disputes: contract.dataValues.number_of_disputes,
      // buyer details
      buyer_id: contract.procurementRequest.buyer.id,
      buyer_name: `${contract.procurementRequest.buyer.first_name} ${contract.procurementRequest.buyer.last_name}`,
      buyer_company_name: contract.procurementRequest.buyer?.company_name,
      buyer_email: contract.procurementRequest.buyer.email,
      // seller details
      seller_id: contract.bid.seller.id,
      seller_name: `${contract.bid.seller.first_name} ${contract.bid.seller.last_name}`,
      seller_company_name: contract.bid.seller?.company_name,
      seller_email: contract.bid.seller.email,
      // request details
      procurement_request_id: contract.procurement_request_id,
      procurement_request_title: contract.procurementRequest.title,
      procurement_bid_id: contract.bid_id,
      procurement_category: contract.procurementRequest.procurementCategory?.name,
      payment_instructions: contract.paymentInstructions.map(instr => ({
        id: instr.id,
        payment_policy: instr.payment_policy,
        date: instr.date,
        amount: instr.amount
      })),
    };
  }));

  return response;
};

// Vrati sve ugovore buyera/sellera
const getContracts = async (req, res) => {
  try {
    const contracts = await fetchContracts({ user: req.user, query: req.query });
    return res.json(contracts);
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Vrati ugovor sa id-em
const getContractById = async (req, res) => {
  try {
    const contractId = req.params.id;
    const contract = await fetchContracts({ user: req.user, query: {}, contractId });

    console.log('Fetched contract:', contract);

    if (contract.length === 0) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    return res.json(contract);
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

const acceptContract = async (req, res) => {
  try{
    const contractId = req.params.id;
    const sellerId = req.user.id;
    const { seller_bank_account } = req.body;
    //find contract
    const contract  = await Contract.findByPk(contractId,{
      include: [
        {
          model: ProcurementRequest,
          as: 'procurementRequest',
          include: [
            {
              model: User,
              as: 'buyer',
              attributes: ['id', 'first_name', 'last_name', 'company_name', "email"]
            }
          ]
        },
        {
          model: ProcurementBid,
          as: 'bid',
          attributes: ['id', 'seller_id'],
        }
      ]
    });
    if(!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    //check if sellers bank account is provided
    /*if(!seller_bank_account)
      return res.status(400).json({ message: 'Seller bank account is required' });*/
    
    //check if the contract status is valid not signed
    if(contract.status !== 'issued' && contract.status !== 'edited') {
      return res.status(400).json({ message: 'Contract is not in a state that can be accepted' });
    }
    //update contract status
    contract.status = 'signed';
    await contract.save();
    //save seller bank account
    if (seller_bank_account){
      await User.update({seller_bank_account: seller_bank_account}, {where: {id: sellerId}});
    }

    //send email to buyer
    const htmlContent = generateContractSignedEmailHtml({
        user: contract.procurementRequest.buyer,
        requestTitle: contract.procurementRequest.title,
        originalName: contract.original_name,
        contractId: contract.id,
        price: contract.price,
        logoCid: 'logoImage'
    });

    await sendMail({
        to: contract.procurementRequest.buyer.email,
        subject: 'Contract accepted and signed',
        text: `Dear ${contract.procurementRequest.buyer.first_name} ${contract.procurementRequest.buyer.last_name},\n\nThe contract for "${contract.procurementRequest.title}" has been accepted and signed by the seller.\n\nContract ID: ${contract.id}`,
        html: htmlContent,
        attachments: [
            {
                filename: 'logo.png',
                path: path.join(__dirname, '../../public/logo/logo-no-background.png'),
                cid: 'logoImage',
                contentDisposition: 'inline',
            }
        ],
    });
    //add log for contract
    await ContractLog.create({
      contract_id: contract.id,
      action: 'Contract accepted and signed',
      user_id: sellerId,
    });

    //create notification for buyer
    await Notification.create({
      contract_id: contract.id,
      user_id: contract.procurementRequest.buyer.id,
      text: `Contract has been accepted.`,
    });

    //create notification for admins
      const admins = await User.findAll({ where: { role: 'admin' } });
      for (const admin of admins) {
        await Notification.create({
          contract_id: contract.id,
          user_id: admin.id,
          text: `Contract has been accepted.`,
        });
      }

    return res.status(200).json({message: 'Contract accepted and signed successfully'});
  } catch (error) {
    console.error('Error accepting contract:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }

};


module.exports = {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  getContractLogs,
  acceptContract,
};
