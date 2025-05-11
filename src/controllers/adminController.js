const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const db = require("../../database/models");
console.log("User", db);
const buyerTypeController = require("./buyerTypeController");
const { generateBidAlerts } = require('../services/alertService');
const { Where } = require("sequelize/lib/utils");
const { get } = require("../routes/adminRoutes");
const { request } = require("express");


const createUserByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to create users" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      first_name,
      last_name,
      role,
      company_name,
      phone_number,
      address,
      company_address,
      buyer_type,
    } = req.body;
    //validacija broja telefona
    if (!/^\+(\d{1,3})\s?(\d{1,15})(\s?\d{1,15})*$/.test(phone_number)) {
      return res
        .status(400)
        .json({ error: "Phone number is not in the correct format" });
    }
    //validacija password-a
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password) ||
      !/[\W_]/.test(password)
    ) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long, contain one uppercase letter, one number, and one special character",
      });
    }
    //provjera ispravnosti email formata
    if (email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    //provjera da li korisnik vec postoji
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    let buyerType = null;
    if (role === "buyer" && buyer_type) {
      buyerType = await buyerTypeController.findBuyerTypeByName(buyer_type);
      // console.log("BuyerType", buyerType);
      if (!buyerType) {
        buyerType = await db.BuyerType.create({ name: buyer_type });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const newUser = await db.User.create({
      email,
      password_hash,
      first_name,
      last_name,
      role,
      company_name: company_name !== undefined ? company_name : null,
      phone_number: phone_number !== undefined ? phone_number : null,
      address: address !== undefined ? address : null,
      company_address: company_address !== undefined ? company_address : null,
      buyer_type_id: buyerType ? buyerType.id : null,
      status: "pending", //po potrebe izmijeniti i ovo ukoliko admin moze odma status mijenjati
      created_at: new Date(),
    });
    return res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to update users" });
    }
    const userId = req.params.id;
    const {
      email,
      first_name,
      last_name,
      role,
      company_name,
      phone_number,
      address,
      company_address,
    } = req.body;

    console.log("userId:", userId);
    const user = await db.User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    /*
    //provjera da li su poslani neki drugi parametrni -> izmijeniti po potrebi
    const allowedFields = ['role'];
    const invalidFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({ error: `You cannot update the following fields: ${invalidFields.join(', ')}` });
    }
    //provjera da li je polje role ispravno
    if (role && !['admin', 'buyer', 'seller'].includes(role)) {
        return res.status(400).json({ error: 'Role must be one of: admin, buyer, seller' });
      }
    user.role = role || user.role;
    user.updated_at = new Date();
    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });*/

    let newRole;
    if (user.role === "buyer") {
      newRole = "seller";
    } else if (user.role === "seller") {
      newRole = "buyer";
    } else if (user.role === "admin") {
      // Cannot update admin role
      return res.status(400).json({ error: "Cannot update admin role" });
    }

    user.role = newRole;
    user.updated_at = new Date();
    await user.save();

    res.status(200).json({ message: "User role updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllProcurementRequestsAsAdmin = async (req, res) => {
  try {
    const [results] = await db.sequelize.query(`
        SELECT 
          pr.id,
          pr.title,
          pr.description,
          pr.deadline,
          pr.flagged,
          pr.status,
          pc.name AS category,
          u.email AS buyerEmail,
          COUNT(DISTINCT pb.id) AS bids,
          COUNT(DISTINCT a.id) AS logs
        FROM procurement_requests pr
        INNER JOIN procurement_categories pc ON pr.category_id = pc.id
        INNER JOIN users u ON pr.buyer_id = u.id
        LEFT JOIN procurement_bids pb ON pb.procurement_request_id = pr.id
        LEFT JOIN admin_logs a ON a.procurement_bid_id = pb.id
        GROUP BY pr.id, pr.title, pr.description, pr.deadline, pr.flagged, pr.status, pc.name, u.email
      `);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error loading procurement requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getBidLogsForProcurementRequest = async (req, res) => {
  const procurementRequestId = req.params.id; // Procurement request ID from URL

    try {
      const bids = await db.ProcurementBid.findAll({
        where: { procurement_request_id: procurementRequestId },
        include: [
          {
            model: db.User,
            as: 'seller',
            attributes: ['first_name', 'last_name'],
          },
          {
            model: db.AdminLog,
            as: 'adminLogs',
            attributes: ['action', 'created_at'],
            order: [['created_at', 'DESC']],
          },
          {
            model: db.BidEvaluation,
            as: 'evaluations',
            where: { evaluation_criteria_id: null },
            required: false,
            attributes: ['score'],
          }
        ],
        order: [['created_at', 'DESC']],
      });

    // Prepare data for frontend
    console.log(JSON.stringify(bids));
    
    const BidData = bids.map((bid) => ({
      seller: bid.seller?.first_name + ' ' + bid.seller?.last_name || null,
      price: bid.price,
      timeline: bid.timeline,
      proposal: bid.proposal_text,
      submitted_at: bid.submitted_at ? bid.submitted_at.toISOString() : null,
      adminLogs: bid.adminLogs ? bid.adminLogs : null,
      score: bid.evaluations?.[0]?.score ?? null
    }));

    res.json(BidData);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).send("Internal Server Error");
  }
};

const generateAlerts = async (req, res) => {
  const procurementRequestId = req.params.id;

  try {
   // await generateBidAlerts(db, procurementRequestId);

    const alerts = await db.AdminAlert.findAll({
      where: { procurement_request_id: procurementRequestId },
      attributes: ['alert', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    res.status(200).json(alerts)
  } catch (error) {
    console.error('Error generating alerts:', error);
    res.status(500).send('Internal server error.');
  }
};

const updateAllAlerts = async (req, res) => {
  try {
    const allRequests = await db.ProcurementRequest.findAll({ attributes: ['id'] });

    for (const request of allRequests) {
      await generateBidAlerts(db, request.id);
    }
    
    res.status(200).send('All bids checked and flags updated.');
  } catch (error) {
    console.error('Error updating alerts:', error);
    res.status(500).send('Internal server error.');
  }
};

const getRequestCountsByStatus = async (req, res) => {
  try{
    const requestCounts = await db.ProcurementRequest.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
          status: ['active', 'closed', 'frozen', 'awarded']
        },
      group: ['status'],
      raw: true
    });
    return res.status(200).json(requestCounts);
  }catch(error){
    console.error("Error loading analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAuctionsCount = async (req, res) => {
  try {
    const totalCount = await db.Auction.count();
    
    return res.status(200).json({
      total_auctions: totalCount
    });

  } catch (error) {
    console.error("Error loading auctions counts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getBidsCount = async (req, res) => {  
  try {
    const totalCount = await db.ProcurementBid.count();
    
    return res.status(200).json({
      total_bids: totalCount
    });
  } catch (error) {
    console.error("Error loading bids counts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFrozenRequestsRatio = async (req, res) => {
try{
  const totalCount = await db.ProcurementRequest.count({
    where: {
          status: ['active', 'closed', 'frozen', 'awarded']
  }
  });
  const frozenCount = await db.ProcurementRequest.count({
    where: {
      status: 'frozen'
    }
  });
  const ratio = parseFloat((frozenCount / totalCount) * 100).toFixed(2);
  return res.status(200).json({
    total_count: totalCount,
    frozen_count: frozenCount,
    frozen_ratio: ratio
  });
} catch(error){ 
  console.error("Error loading frozen ratio:", error);
  res.status(500).json({ error: "Internal server error" });
}
};

const getRequestsByCategories = async (req, res) => {
  try {
    //gat all procurement categories
    const allCategories = await db.ProcurementCategory.findAll({
      attributes: ['id', 'name'],
      raw: true
    });
    //get all requests grouped by category
    const requestsByCategories = await db.ProcurementRequest.findAll({
      attributes: [
        'category_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_requests']
      ],
      group: ['category_id'],
      raw: true
    });
    //map all categories with their request counts
    const result = allCategories.map(category => {
      const requestCount = requestsByCategories.find(r => r.category_id === category.id);
      return {
        category_id: category.id,
        category: category.name,
        total_requests: requestCount ? parseInt(requestCount.total_requests) : 0
      };
    });
    //sort the result by total_requests in descending order
    result.sort((a, b) => b.total_requests - a.total_requests);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching requests by categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getAvgBidsByCategory = async (req, res) => {
  try {
    //all categories
    const allCategories = await db.ProcurementCategory.findAll({
      attributes: ['id', 'name'],
      raw: true
    });
    //all bids with categories
    const bidsWithCategories = await db.ProcurementBid.findAll({
      include: [{
        model: db.ProcurementRequest,
        as: 'procurementRequest',
        include: [{
          model: db.ProcurementCategory,
          as: 'procurementCategory'
        }]
      }],
      raw: true
    });
  //group all bids by category
    const bidsByCategory = {};
    //initialize all categories to 0 
    allCategories.forEach(category => {
      bidsByCategory[category.id] = {
        category_id: category.id,
        category: category.name,
        bids_count: 0,
        requests_count: new Set()
      };
    });
    bidsWithCategories.forEach(bid => {
      const categoryId = bid['procurementRequest.procurementCategory.id'];
      bidsByCategory[categoryId].bids_count++;
      bidsByCategory[categoryId].requests_count.add(bid.procurement_request_id);
    });
    //calculate average bids per category
    const result = Object.values(bidsByCategory).map(category => ({
      category_id: category.category_id,
      category: category.category,
      avg_bids: category.requests_count.size > 0 
        ? parseFloat((category.bids_count / category.requests_count.size).toFixed(2))
        : 0
    }));
    //sort the result by avg_bids in descending order
    result.sort((a, b) => b.avg_bids - a.avg_bids);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error loading average bids by category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAvgTimeToAward = async (req, res) => {
  try {
    //get all awarded requests
    const awardedRequests = await db.ProcurementRequest.findAll({
      where: { status: 'awarded' },
      attributes: ['id', 'title', 'created_at', 'updated_at'],
      raw: true
    });
    //if there are no awarded requests, return 0
    if (awardedRequests.length === 0) {
      return res.status(200).json({
        average_time_minutes: 0,
        total_awarded_requests: 0,
        message: "Nema awarded zahtjeva"
      });
    }
    //calculate duration in minutes
    const requestsWithMinutes = awardedRequests.map(request => {
      const minutes = Math.round(
        (new Date(request.updated_at) - new Date(request.created_at)) / (1000 * 60)
      );
      return { ...request, duration_minutes: minutes };
    });
    //calculate average time in minutes
    const totalMinutes = requestsWithMinutes.reduce((sum, req) => sum + req.duration_minutes, 0);
    const averageMinutes = (totalMinutes / requestsWithMinutes.length).toFixed(2);

    return res.status(200).json({
      average_time_minutes: parseFloat(averageMinutes),
      total_awarded_requests: awardedRequests.length,
      details: requestsWithMinutes.map(req => ({
        request_id: req.id,
        title: req.title,
        duration_minutes: req.duration_minutes,
        created_at: req.created_at,
        awarded_at: req.updated_at
      }))
    });

  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};


const getTop5BuyersFrozen = async (req, res) => {
  try {
    //get buyers with frozen requests
    const buyersWithFrozenCounts = await db.ProcurementRequest.findAll({
      attributes: [
        'buyer_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'frozen_count']
      ],
      where: {
        status: 'frozen'
      },
      group: ['buyer_id'],
      order: [[db.sequelize.literal('frozen_count'), 'DESC']],
      limit: 5,
      raw: true
    });

    //if there are no buyers with frozen requests, return empty array
    if (!buyersWithFrozenCounts.length) {
      return res.status(200).json([]);
    }
    //get total requests count for each buyer
    const buyerid = buyersWithFrozenCounts.map(b => b.buyer_id);
    const totalRequests = await db.ProcurementRequest.findAll({
      attributes: [
        'buyer_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_count']
      ],
      where: {
        buyer_id: buyerid
      },
      group: ['buyer_id'],
      raw: true
    });
    //get buyer with frozen requests details
    const buyerIds = buyersWithFrozenCounts.map(b => b.buyer_id);
    const buyers = await db.User.findAll({
      where: {
        id: buyerIds
      },
      attributes: ['id', 'first_name', 'last_name', 'company_name'],
      raw: true
    });

    //map buyers with frozen requests to their details
    const result = buyersWithFrozenCounts.map(buyerCount => {
      const buyerInfo = buyers.find(b => b.id === buyerCount.buyer_id) || {};
      return {
        buyer_id: buyerCount.buyer_id,
        first_name: buyerInfo.first_name || '',
        last_name: buyerInfo.last_name || '',
        company_name: buyerInfo.company_name || '',
        frozen_requests_count: buyerCount.frozen_count,
        total_requests_count: totalRequests.find(r => r.buyer_id === buyerCount.buyer_id)?.total_count || 0,
      };
    });
    //sort the result by frozen_requests_count in descending order
    result.sort((a, b) => b.frozen_requests_count - a.frozen_requests_count);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error loading top 5 buyers with frozen requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const getRequestsStatusDistribution = async (req, res) => {
  try {
    const allStatuses = ['active', 'closed', 'frozen', 'awarded'];
    //get all requests grouped by status
    const requestCounts = await db.ProcurementRequest.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        status: allStatuses
      },
      group: ['status'],
      raw: true
    });
    const countsMap = {};
    requestCounts.forEach(item => {
      countsMap[item.status] = parseInt(item.count);
    });
    //map all statuses with their counts
    const fullDistribution = allStatuses.map(status => ({
      status,
      count: countsMap[status] || 0
    }));
    //total number of requests
    const total = fullDistribution.reduce((sum, item) => sum + item.count, 0);
    //calculate percentage for each status
    const result = fullDistribution.map(item => ({
      status: item.status,
      count: item.count,
      percentage: total === 0 ? 0 : parseFloat(((item.count / total) * 100).toFixed(2))
    }));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error loading requests status distribution:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTop5BuyersPriceReduction = async (req, res) => {
  try {
    //get all winning bids where auction has ended
    const winningBids = await db.ProcurementBid.findAll({
      where: {
        auction_placement: 1,
        '$auction.ending_time$': {
          [db.Sequelize.Op.lt]: new Date()
        }
      },
      include: [
        {
          model: db.Auction,
          as: 'auction',
          attributes: ['ending_time'],
          required: true
        },
        {
          model: db.ProcurementRequest,
          as: 'procurementRequest',
          include: [
            {
              model: db.User,
              as: 'buyer',
              attributes: ['id', 'first_name', 'last_name', 'company_name']
            }
          ],
          required: true
        }
      ],
      attributes: [
        'id',
        'price',
        'auction_price',
        [db.sequelize.literal('(auction_price / price)'), 'price_ratio']
      ],
      raw: true
    });

    if (winningBids.length === 0) {
      return res.status(200).json([]);
    }
    //group winning bids by buyer and calculate ratios
    const buyersMap = new Map();
    winningBids.forEach(bid => {
      const buyerId = bid['procurementRequest.buyer.id'];
      if (!buyersMap.has(buyerId)) {
        buyersMap.set(buyerId, {
          buyer_id: buyerId,
          first_name: bid['procurementRequest.buyer.first_name'],
          last_name: bid['procurementRequest.buyer.last_name'],
          company_name: bid['procurementRequest.buyer.company_name'],
          total_ratio: 0,
          bid_count: 0,
          auctions: [] //for individual auction details
        });
      }
      
      const buyer = buyersMap.get(buyerId);
      const ratio = parseFloat(bid.price_ratio);
      buyer.total_ratio += ratio;
      buyer.bid_count += 1;
      buyer.auctions.push({
        initial_price: bid.price,
        final_price: bid.auction_price,
        ratio: ratio
      });
    });

    //calculate average benefit per buyer
    const buyersWithBenefits = Array.from(buyersMap.values()).map(buyer => {
      const averageRatio = buyer.total_ratio / buyer.bid_count;
      const averageBenefit = 100 - (averageRatio * 100); // Convert to percentage benefit
      
      return {
        buyer_id: buyer.buyer_id,
        first_name: buyer.first_name,
        last_name: buyer.last_name,
        company_name: buyer.company_name,
        average_benefit: parseFloat(averageBenefit.toFixed(2)),
        total_auctions: buyer.bid_count,
        auctions: buyer.auctions.map(auction => ({
          initial_price: auction.initial_price,
          final_price: auction.final_price,
          ratio: parseFloat(auction.ratio.toFixed(4)),
          benefit_percentage: parseFloat((100 - (auction.ratio * 100)).toFixed(2))
        }))
      };
    });

    //sort by average benefit descending and get top 5
    const top5Buyers = buyersWithBenefits
      .sort((a, b) => b.average_benefit - a.average_benefit)
      .slice(0, 5);

    return res.status(200).json(top5Buyers);
  } catch (error) {
    console.error("Error calculating top buyers by price reduction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = {
  createUserByAdmin,
  updateUserByAdmin,
  getAllProcurementRequestsAsAdmin,
  getBidLogsForProcurementRequest,
  generateAlerts,
  updateAllAlerts,
  getRequestCountsByStatus,
  getAuctionsCount,
  getBidsCount,
  getFrozenRequestsRatio, 
  getRequestsByCategories,
  getAvgBidsByCategory,
  getAvgTimeToAward,
  getTop5BuyersFrozen,
  getRequestsStatusDistribution,
  getTop5BuyersPriceReduction
};
