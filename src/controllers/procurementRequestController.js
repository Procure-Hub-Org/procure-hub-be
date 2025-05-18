const procurementRequestService = require("../services/procurementRequestService");
const { Op, where } = require('sequelize');
const { ProcurementRequest, ProcurementCategory, User, BuyerType,EvaluationCriteria,CriteriaType, ProcurementItem, Requirement} = require('../../database/models/'); 
const { getBuyerTypeById } = require('./buyerTypeController')

exports.follow = async (req, res) => {
    const sellerId = req.user.id;
    const requestId = req.params.id;

    try {
        const favorite = await procurementRequestService.addFavorite(sellerId, requestId);
        if (favorite) {
            return res.status(200).json({ message: "Followed successfully", favorite });
        } else {
            return res.status(400).json({ message: "Already followed" });
        }
    } catch (error) {
        console.error("Error following request: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.unfollow = async (req, res) => {
    const sellerId = req.user.id;
    const requestId = req.params.id;

    try {
        const removed = await procurementRequestService.removeFavorite(sellerId, requestId);
        if (removed) {
            return res.status(200).json({ message: "Unfollowed successfully" });
        } else {
            return res.status(400).json({ message: "Already unfollowed" });
        }
    } catch (error) {
        console.error("Error unfollowing request: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.getFavorites = async (req, res) => {
    const userId = req.user.id;
    try {
        const favorites = await procurementRequestService.getFavorites(userId);
        if (!favorites) {
            return res.status(404).json({ message: "No favorites found" });
        }
        return res.status(200).json(favorites);
    } catch (error) {
        console.error("Error fetching favorites: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.getBuyerProcurementRequests = async (req, res) => {
    try {
        const currentUser = req.user;
        console.log('Current user:', currentUser);

        if (currentUser.role !== 'buyer') {
            return res.status(403).json({ error: 'Authenticated user is not a buyer' });
        }
        
        requests = await procurementRequestService.getBuyerProcurementRequests(currentUser.id);
        if (!requests) {
            return res.status(404).json({ message: 'No procurement requests found' });
        }

        for(const request of requests) {
          if(request.status === 'active' && new Date(request.deadline) < new Date()) {
            request.status = 'closed';
            request.updated_at = new Date();
            await request.save();
          }
        }
        res.status(200).json({ requests });
      } catch (error) {
        console.error('Error fetching procurement requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

exports.getOpenProcurementRequests = async (req, res) => {
    try {
      const filters = { status: "active" };    
      const { 
        category_id, 
        deadline, 
        buyer_id, 
        location, 
        budget_min,
        budget_max,
        buyer_type_name,
        criteria} = req.query;
  
      //Filters
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
  
      const categories = await ProcurementCategory.findAll({
        attributes: ['id', 'name'],
        raw: true,
      });
  
      const categoryMap = {};
      categories.forEach(cat => {
        categoryMap[cat.id] = cat.name;
      });

      const buyerTypeFilter = buyer_type_name
      ? { name: { [Op.iLike]: `%${buyer_type_name}%` } }
      : undefined;
  
      if (deadline) {
        filters.deadline = { [Op.gte]: new Date(deadline) };
      }

      if (budget_min) {
        filters.budget_max = { [Op.gte]: Number(budget_min) }; 
      }
      
      if (budget_max) {
        filters.budget_min = { [Op.lte]: Number(budget_max) }; 
      }

      if (criteria) {
        filters[Op.or] = [
          { title: { [Op.iLike]: `%${criteria}%` } },
          { description: { [Op.iLike]: `%${criteria}%` } }
        ];
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
            where: { role: 'buyer' },
            include: [
              {
                model: BuyerType,
                attributes: ['name'],
                as: 'buyerType',
                where: buyerTypeFilter,
              }
            ]
          },
          {
            model: EvaluationCriteria,
            as: 'evaluationCriteria',
            attributes: ['weight'], 
            include: [
              {
                model: CriteriaType,
                as: 'criteriaType',
                attributes: ['name'],
              }
            ]
          },
          {
            model: ProcurementItem,
            as: 'items',
            attributes: ['title', 'description', 'quantity']
          },
          {
            model: Requirement,
            as: 'requirements',
            attributes: ['type', 'description']
          }
        ]
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

exports.getProcurementRequestById = async (req, res) => {
  try {
    const id = req.params.id;
    const pr = await ProcurementRequest.findByPk(id, {
      include: [
        { model: ProcurementCategory, as: 'procurementCategory', attributes: ['name'] },
        { model: ProcurementItem,      as: 'items',               attributes: ['title','description','quantity'] },
        { model: Requirement,          as: 'requirements',        attributes: ['type','description'] },
        { model: EvaluationCriteria,   as: 'evaluationCriteria',  attributes: ['weight','is_must_have'],
          include: [{ model: CriteriaType, as: 'criteriaType', attributes: ['name'] }]
        },
        { model: User,                as: 'buyer',              attributes: ['id','role','buyer_type_id','first_name','last_name'],
          include: [{ model: BuyerType, as: 'buyerType', attributes: ['name'] }]
        }
      ]
    });

    if (!pr) return res.status(404).json({ success: false, message: 'Not found' });

    const data = pr.get({ plain: true });
    const card = {
      id:            data.id,
      buyer_id:      data.buyer_id,
      title:         data.title,
      description:   data.description,
      deadline:      data.deadline,
      budget_min:    data.budget_min,
      budget_max:    data.budget_max,
      category_id:   data.category_id,
      status:        data.status,
      location:      data.location,
      documentation: data.documentation,
      flagged:       data.flagged,
      bid_edit_deadline:     data.bid_edit,
      created_at:    data.created_at,
      updated_at:    data.updated_at,
      evaluationCriteria: data.evaluationCriteria,
      items:         data.items,
      requirements:  data.requirements,
      category_name:      data.procurementCategory?.name,
      buyer_full_name: `${data.buyer?.first_name} ${data.buyer?.last_name}`,
      buyer_type_name: data.buyer.buyerType?.name,
    
    };

    res.json({ success: true, data: card });
  }
  catch(err) {
    console.error(err);
    res.status(500).json({ success:false, message:'Internal error' });
  }
};


exports.getProcurementCriteria = async (req, res) => {
  try {
    const criteria = await EvaluationCriteria.findAll({
      attributes: ['weight'],
      include: [
        {
          model: CriteriaType,
          as: 'criteriaType',
          attributes: ['name']
        }
      ]
    });

    const formatted = criteria.map(c => ({
      name: c.criteriaType?.name,
      weight: c.weight
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Failed to fetch procurement criteria:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
