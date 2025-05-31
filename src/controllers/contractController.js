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
} = require('../../database/models');
const { Op } = require('sequelize');
const { sendMail } = require('../services/mailService'); 
const { generateContractIssuedEmailHtml } = require('../utils/templates/emailTemplates');
const path = require('path');

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

    if (!status || !['issued', 'draft'].includes(status)) {
      return res.status(400).json({ message: 'Invalid contract status. Must be "issued" or "draft".' });
    }

    const contract = await Contract.findByPk(contractId);
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
       if (contract.status !== 'draft') {
      return res.status(400).json({ message: 'Only contracts with status "draft" can be updated.' });
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
      action: status === 'issued' ? 'Contract issued (updated)' : 'Contract saved as draft (updated)',
      user_id: req.user.id,
    });

    // Ažuriraj status zahtjeva ako je ugovor izdan
    if (status === 'issued') {
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


/* --- get contracts based on role ---*/
const getContracts = async (req, res) => {
  try {
    const user = req.user;
    const isAdmin = user.role === 'admin';

    // filtrira rezultate prema rolama buyer/seller
    const filter = {};
    if (!isAdmin) {
      filter[Op.or] = [
        { '$procurementRequest.buyer_id$': user.id },
        { '$bid.seller_id$': user.id },
      ]
    }

    const contracts = await Contract.findAll({
      where: filter,
      include: [
        {
          model: ProcurementRequest,
          as: 'procurementRequest',
          attributes: ['id', 'title'],
          include: [
            {
              model: User,
              as: 'buyer',
              attributes: ['id', 'first_name', 'last_name', 'company_name']
            }
          ]
        },
        {
          model: ProcurementBid,
          as: 'bid',
          attributes: ['id'],
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'first_name', 'last_name', 'company_name']
            }
          ]
        },
        // brojanje disputes za contract
        {
          model: Dispute,
          as: 'disputes',
          attributes: [],
        }
      ],
      attributes: {
        include: [
          [Sequelize.fn( 'COUNT', Sequelize.col('disputes.id')), 'number_of_disputes']
        ]
      },
      group: [
        'Contract.id',
        'procurementRequest.id',
        'procurementRequest.buyer.id',
        'bid.id',
        'bid.seller.id'  
      ]
    });

    // forimarnje odgovora
    const response = contracts.map(contract => ({
      contract_id: contract.id,
      buyer_id: contract.procurementRequest.buyer.id,
      buyer_name: `${contract.procurementRequest.buyer.first_name} ${contract.procurementRequest.buyer.last_name}`,
      buyer_company_name: contract.procurementRequest.buyer?.company_name,
      seller_id: contract.bid.seller.id,
      seller_name: `${contract.bid.seller.first_name} ${contract.bid.seller.last_name}`,
      seller_company_name: contract.bid.seller?.company_name,
      procurement_request_id: contract.procurement_request_id,
      procurement_request_title: contract.procurementRequest.title,
      procurement_bid_id: contract.bid_id,
      number_of_disputes: contract.dataValues.number_of_disputes
    }));

    return res.json(response);

  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  createContract,
  getContracts,
<<<<<<< HEAD
  updateContract
=======
  getContractLogs,
>>>>>>> 9/GetContractLogs
};
