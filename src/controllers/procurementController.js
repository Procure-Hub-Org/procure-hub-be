const { Op } = require('sequelize');
const { ProcurementRequest } = require('../../database/models/'); 

const getOpenProcurementRequests = async (req, res) => {
  try {
    const filters = { status: "active" };    
    const { category_id, deadline, buyer_id, location, budget_min,budget_max } = req.query;
    
    if (category_id) {
      filters.category_id = category_id;
    }
    if (buyer_id) {
      filters.buyer_id = buyer_id;
    }
    if (location) {
      filters.location = {
        [Op.iLike]: `%${location}%`,
      };
    }
    // Ako postoji deadline konvertiraj u Date 
    if (deadline) {
      filters.deadline = { [Op.gte]: new Date(deadline) };
    }
    // Ako postoji budzet, konvertiraj u Number
    if (budget_min) {
      filters.budget_min = { [Op.lte]: Number(req.query.budget_min) };
    }
    if (budget_max) {
      filters.budget_max = { [Op.gte]: Number(req.query.budget_max) };
    }

    const requests = await ProcurementRequest.findAll({
      where: filters,
    });
    
    res.status(200).json({ success: true, data: requests });
    
  } catch (error) {
    console.error('Failed to fetch open procurement requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getOpenProcurementRequests };
