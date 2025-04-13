const procurementRequestService = require("../services/procurementRequestService");
const { Op } = require('sequelize');
const { ProcurementRequest, ProcurementCategory, User, BuyerType} = require('../../database/models/'); 
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

        res.status(200).json({ requests });
      } catch (error) {
        console.error('Error fetching procurement requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

exports.getOpenProcurementRequests = async (req, res) => {
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