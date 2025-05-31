const { Contract, ProcurementRequest, ProcurementBid, User, Dispute, Sequelize, ContractLog } = require('../../database/models');
const { Op, where } =  require('sequelize');
const { sendMail } = require('../services/mailService');
const path = require('path');
const { generateContractSignedEmailHtml } = require('../utils/templates/emailTemplates');

const createContract = async (req, res) => {
  try {
    const { procurement_request_id, bid_id } = req.body;

    if (!procurement_request_id || !bid_id) {
      return res.status(400).json({ message: 'Missing required fields: procurement_request_id and bid_id' });
    }

    // Pronađi request
    const procurementRequest = await ProcurementRequest.findByPk(procurement_request_id);
    if (!procurementRequest) {
      return res.status(404).json({ message: 'Procurement request not found' });
    }

    //  Provjeri da li je trenutni korisnik vlasnik (buyer) tog requesta
    if (procurementRequest.buyer_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to award this procurement request' });
    }

    // Provjeri da li je status 'closed'
    if (procurementRequest.status !== 'closed') {
      return res.status(400).json({ message: 'Only closed procurement requests can be awarded' });
    }

    //  Pronađi bid
    const bid = await ProcurementBid.findByPk(bid_id);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Provjeri da li je bid povezan sa datim requestom
    if (bid.procurement_request_id !== procurement_request_id) {
      return res.status(400).json({ message: 'Bid does not belong to the given procurement request' });
    }

    // Kreiraj ugovor
    const contract = await Contract.create({
      procurement_request_id,
      bid_id
    });

    // 7. Ažuriraj status u 'awarded'
    procurementRequest.status = 'awarded';
    await procurementRequest.save();

    return res.status(201).json({
      message: 'Contract created and procurement request status updated to awarded',
      contract
    });

  } catch (error) {
    console.error('Error creating contract:', error);
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
    if(!seller_bank_account)
      return res.status(400).json({ message: 'Seller bank account is required' });
    
    //check if the contract status is valid not signed
    if(contract.status !== 'issued' && contract.status !== 'edited') {
      return res.status(400).json({ message: 'Contract is not in a state that can be accepted' });
    }
    //update contract status
    contract.status = 'signed';
    await contract.save();
    //save seller bank account
    await User.update({seller_bank_account: seller_bank_account}, {where: {id: sellerId}});

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
      return res.status(200).json({message: 'Contract accepted and signed successfully'});
  } catch (error) {
    console.error('Error accepting contract:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }

};


module.exports = {
  createContract,
  getContracts,
  acceptContract,
};
