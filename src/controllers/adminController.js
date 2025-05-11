const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const db = require("../../database/models");
console.log("User", db);
const buyerTypeController = require("./buyerTypeController");
const { generateBidAlerts } = require('../services/alertService');
const bidDocumentService = require("../services/bidDocumentService");


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

    const BidData = await Promise.all(
      bids.map(async (bid) => {
        const documents = await bidDocumentService.getBidDocumentsByProcurementBidId(bid.id);
        return {
          seller: bid.seller?.first_name + ' ' + bid.seller?.last_name || null,
          price: bid.price,
          timeline: bid.timeline,
          proposal: bid.proposal_text,
          submitted_at: bid.submitted_at ? bid.submitted_at.toISOString() : null,
          documents: documents,
          adminLogs: bid.adminLogs ? bid.adminLogs : null,
          score: bid.evaluations?.[0]?.score ?? null
        };
      })
    );

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



module.exports = {
  createUserByAdmin,
  updateUserByAdmin,
  getAllProcurementRequestsAsAdmin,
  getBidLogsForProcurementRequest,
  generateAlerts,
  updateAllAlerts
};
