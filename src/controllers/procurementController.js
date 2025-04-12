const { Op } = require('sequelize');
const { ProcurementRequest, ProcurementCategory, User, BuyerType} = require('../../database/models/'); 
const { getBuyerTypeById } = require('./buyerTypeController')

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

    // Dohvati sve kategorije u mapi
    const categories = await ProcurementCategory.findAll({
      attributes: ['id', 'name'],
      raw: true,
    });

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.id] = cat.name;
    });


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
      include: [
        {
          model: ProcurementCategory,
          attributes: ['name'],
          as: 'procurementCategory',
        },
        {
          model: User,
          attributes: ['id', 'role', 'buyer_type_id', 'first_name', 'last_name'],
          as: 'buyer',
          where: {
            role: 'buyer',
          },
          include: [
            {
              model: BuyerType,
              attributes: ['name'],
              as: 'buyerType',
            },
          ],
        },
      ],
    });

    // Format each request
    const formattedRequests = requests.map(req => {
      const { procurementCategory, buyer, ...rest } = req.get({ plain: true });
      const fullName = `${buyer?.first_name} ${buyer?.last_name}`;
      return {
        ...rest,
        category_name: procurementCategory?.name || null,
        buyer_type_name: buyer?.buyerType?.name || null,
        buyer_full_name: fullName,
      };
    });
    
    
    
    res.status(200).json({ success: true, data: formattedRequests });
    
  } catch (error) {
    console.error('Failed to fetch open procurement requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getOpenProcurementRequests };
