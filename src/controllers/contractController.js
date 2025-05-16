const { Contract, ProcurementRequest, ProcurementBid } = require('../../database/models');

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

module.exports = {
  createContract,
};
