const { Contract, ProcurementRequest, ProcurementBid, User, Dispute, Sequelize } = require('../../database/models');
const { Op } =  require('sequelize');

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

module.exports = {
  createContract,
  getContracts,
};
