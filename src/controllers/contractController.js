const { Contract,
  ProcurementRequest,
  ProcurementBid,
  User,
  Dispute,
  ProcurementCategory,
  PaymentInstruction,
  Sequelize } = require('../../database/models');
const { Op } = require('sequelize');

const contractDocumentService = require('../services/contractDocumentService');

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
        attributes: ['id'],
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
      // contract details
      contract_id: contract.id,
      award_date: contract.created_at,
      price: contract.price,
      delivery_terms: contract.timeline,
      status: contract.status,
      contract_document_url: contractDocument?.file_url || null,
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

module.exports = {
  createContract,
  getContracts,
  getContractById
};
