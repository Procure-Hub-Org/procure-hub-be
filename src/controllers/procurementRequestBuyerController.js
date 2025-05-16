const {
  ProcurementRequest,
  ProcurementItem,
  Requirement,
  ProcurementCategory,
  User,
  ProcurementBid, 
  CriteriaType, 
  EvaluationCriteria,
  Contract
} = require("../../database/models");

// const { Op } = require("sequelize");
const { Op, Sequelize } = require('sequelize');

module.exports = {
  createProcurementRequest: async (req, res) => {
    const t = await ProcurementRequest.sequelize.transaction();
    try {
      // Provjera uloge korisnika
      const user = await User.findByPk(req.user.id);
      if (!user || user.role !== "buyer") {
        return res
          .status(403)
          .json({
            message:
              "You do not have the required role to create a procurement request",
          });
      }
      if (user.status !== "active") {
        return res
          .status(403)
          .json({
            message: "Your account is not active. Please contact support.",
          });
      }

      // Destrukturiranje podataka iz tijela zahtjeva — bez buyer_id!
      const {
        title,
        description,
        deadline,
        budget_min,
        budget_max,
        category,
        status,
        location,
        bid_edit_deadline,
        items,
        requirements,
        criteria,
        /*documentation, // Ovdje uzimamo URL iz tijela zahtjeva*/
      } = req.body;
      const itemsParsed = items
        ? typeof items === "string"
          ? JSON.parse(items)
          : items
        : [];
      const requirementsParsed = requirements
        ? typeof requirements === "string"
          ? JSON.parse(requirements)
          : requirements
        : [];

      const categoryData = await ProcurementCategory.findOne({
        where: { name: category },
      });
      if (!categoryData) {
        return res.status(400).json({ message: "Invalid category" });
      }
      const categoryId = categoryData.id;

      // Ako postoji URL za dokumentaciju, koristimo ga, inače null
      //const documentPath = req.file ? req.file.path : null;

      // Ako je status 'active', sve mora biti popunjeno
      if (status === "active") {
        if (
          !title ||
          !description ||
          !deadline ||
          !budget_min ||
          !budget_max ||
          !category ||
          !location ||
          !items ||
          items.length === 0
        ) {
          return res.status(400).json({
            message:
              "All fields and at least one item are required when status is active",
          });
        }
      }
      //provjera validnosti budget_min i budget_max
      if (budget_min < 0 || budget_max < 0) {
        return res.status(400).json({ message: "Budgets cannot be negative" });
      }
      if (budget_max < budget_min) {
        return res
          .status(400)
          .json({
            message: "Maximum budget cannot be less than minimum budget",
          });
      }
      if (budget_min === budget_max) {
        return res
          .status(400)
          .json({ message: "Minimum and maximum budget cannot be the same" });
      }
      //ne moze se kreirati zahtjev sa statusom closed ili awarded
      {
        /*if(status === 'closed' && status !== 'awarded') {
        return res.status(400).json({ message: 'Procurement request cannot be created with status closed or awarded' }); 
      }*/
      }
      // Provjera datuma
      if (new Date(deadline) < new Date() || (bid_edit_deadline && new Date(bid_edit_deadline) < new Date())) {
        return res.status(400).json({ message: 'Deadline cannot be in the past' }); 
      }
      //provjera validnosti za requirements type
      if (requirementsParsed) {
        for (let req of requirementsParsed) {
          if (
            req.type !== "technical" &&
            req.type !== "legal" &&
            req.type !== "Legal" &&
            req.type !== "Technical"
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Invalid requirement type. Must be either "technical" or "legal".',
              });
          }
        }
      }
      const created_at = new Date();
      const updated_at = new Date();

      // Kreiranje zahtjeva za nabavku
      const procurementRequest = await ProcurementRequest.create({
        buyer_id: req.user.id,
        title,
        description,
        deadline,
        budget_min,
        budget_max,
        category_id: categoryId,
        status,
        location,
        bid_edit_deadline,
        documentation: null,//documentPath, // Pohranjujemo URL dokumentacije
        created_at,
        updated_at,
      },{ transaction: t });
      //mora postojati barem jedan item
      if (itemsParsed && itemsParsed.length > 0) {
        await ProcurementItem.bulkCreate(
          itemsParsed.map((item) => ({
            procurement_request_id: procurementRequest.id,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            created_at,
            updated_at,
          })),{ transaction: t }
        );
      } else {
        return res
          .status(400)
          .json({ message: "At least one item must be provided" });
      }

      // Dodavanje zahtjeva ako postoje
      if (requirementsParsed && requirementsParsed.length > 0) {
        await Requirement.bulkCreate(
          requirementsParsed.map((requirement) => ({
            procurement_request_id: procurementRequest.id,
            type: requirement.type,
            description: requirement.description,
            created_at,
            updated_at,
          })),{ transaction: t }
        );
      }
      const evaluationParsed = criteria ? (typeof criteria === 'string' ? JSON.parse(criteria) : criteria) : [];

      if (evaluationParsed && evaluationParsed.length > 0) {
        let totalWeight = 0;
        const evaluationEntries = [];

        for (let criteria of evaluationParsed) {
          const criteriaType = await CriteriaType.findOne({ where: { name: criteria.name } });
          if (!criteriaType) {
            return res.status(400).json({ message: `Invalid criteria type: ${criteria.name}` });
          }
          const weight = parseFloat(criteria.weight);
          if (isNaN(weight) || weight < 0 || weight > 100) {
            return res.status(400).json({ message: `Invalid weight for criteria: ${criteria.name}` });
          }
          totalWeight += weight;
          evaluationEntries.push({
            procurement_request_id: procurementRequest.id,
            criteria_type_id: criteriaType.id,
            weight: weight,
            is_must_have: criteria.is_must_have === true || criteria.is_must_have === 'true',
            created_at,
            updated_at,
          });
        }

        if (totalWeight !== 100) {
          return res.status(400).json({ message: 'Total weight of all evaluation criteria must be exactly 100%' });
        }

        await EvaluationCriteria.bulkCreate(evaluationEntries,{ transaction: t });
      }
      await t.commit(); 
      // Vraćanje odgovora
      res.status(201).json({
        message: "Procurement request created successfully",
        procurementRequest,
      });
    } catch (error) {
      await t.rollback(); // Rollback transaction in case of error
      console.error(error);
      res
        .status(500)
        .json({ message: "Something went wrong", error: error.message });
    }
  },

  updateProcurementRequestStatus: async (req, res) => {
    try {
      const id = req.params.id; // procurement request id
      console.log(req.body);
      const { status } = req.body; //new status
      const userId = req.user.id;
      console.log("user id", userId);
      //check if the user status is active
      if (req.user.status !== "active") {
        return res
          .status(403)
          .json({
            message: "Your account is not active. Please contact support.",
          });
      }
      //check if the status is valid
      const validStatuses = ['active', 'closed', 'draft', 'awarded', 'frozen'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      //procurement request id
      const procurementRequest = await ProcurementRequest.findByPk(id);
      //check if the procurement request exists
      if (!procurementRequest) {
        return res
          .status(404)
          .json({ message: "Procurement request not found" });
      }
      //check if the logged-in user is the buyer who created this procurement request
      if (procurementRequest.buyer_id !== userId && req.user.role !== "admin") {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to change the status of this procurement",
          });
      }
      //if the current status is the same as new status no need to update
      if (procurementRequest.status === status) {
        return res
          .status(400)
          .json({ message: "Status is already set to the requested value" });
      }

      //check if the status can be changed from current status to new status
      /*if (procurementRequest.status === 'draft' && status != 'active') {
        return res.status(400).json({ message: 'Status from draft can only be changed to active' });
      }if (procurementRequest.status === 'active' && status != 'awarded' && status != 'closed') {
        return res.status(400).json({ message: 'Status from active can only be change to awarded or closed' });
      }if(procurementRequest.status === 'awarded'){
        return res.status(400).json({ message: 'Status cannot be changed from awarded' });
      }*/

      //allowed status transitions 
      const allowedTransitions = {
      draft: ['active'],
      active: ['closed', 'frozen'],
      frozen: ['active', 'closed'],
      closed: ['awarded', 'frozen'],
    };
    
    //get valid next statuses for current status
    const validNextStatuses = allowedTransitions[procurementRequest.status] || [];
    
    //check if the desired new status is allowed
    if (!validNextStatuses.includes(status)) {
      return res.status(400).json({ message: `Status cannot be changed from ${procurementRequest.status} to ${status}` });
    }

      //update the status to newStatus
      procurementRequest.status = status;
      procurementRequest.updated_at = new Date();
      await procurementRequest.save();

      res
        .status(200)
        .json({
          message: "Procurement request status updated successfully",
          procurementRequest,
        });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Something went wrong", error: error.message });
    }
  },

  updateProcurementRequest: async (req, res) => {
    const t = await ProcurementRequest.sequelize.transaction();
    try {
      const procurementId = req.params.id;
      const userId = req.user.id;
      const {
        title,
        description,
        deadline,
        budget_min,
        budget_max,
        category,
        status,
        location,
        items,
        requirements,
        criteria,
        bid_edit_deadline,
      } = req.body;

      const procurementRequest = await ProcurementRequest.findOne({
        where: { id: procurementId },
      });
      if (!procurementRequest) {
        return res
          .status(404)
          .json({ message: "Procurement request not found" });
      }
  
      //only the buyer who created this procurement request can update it
      if (procurementRequest.buyer_id !== userId) {
        return res
          .status(403)
          .json({
            message:
              "You are not authorized to update this procurement request",
          });
      }
      //check if the user status is active
      if (req.user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
      }
      //check if the new status is valid
      if (status === 'closed' || status === 'awarded' || status === 'frozen') {
        return res.status(400).json({ message: 'Cannot set status to closed, awarded or frozen through this route' });
      }
      //if the status is not draft the procurement cannot be updated
      if (procurementRequest.status !== 'draft') {
        return res.status(400).json({ message: 'Cannot update procurement with status active, update or awarded.' });
      }
      //if the new status is active, all fields must be filled
      if (status === 'active') {
        if (!title || !description || !deadline || !budget_min || !budget_max || !category || !location || !items || items.length === 0) {
          return res.status(400).json({ message: 'All fields and at least one item are required when setting status to active' });
        }
      }
      //validate budget
      if (budget_min < 0 || budget_max < 0) {
        return res.status(400).json({ message: "Budgets cannot be negative" });
      }
      if (budget_max < budget_min) {
        return res
          .status(400)
          .json({
            message: "Maximum budget cannot be less than minimum budget",
          });
      }
      if (budget_min === budget_max) {
        return res
          .status(400)
          .json({ message: "Minimum and maximum budget cannot be the same" });
      }
      //check if the deadline is in the past
      if (new Date(deadline) < new Date() || (bid_edit_deadline && new Date(bid_edit_deadline) < new Date())) {
        return res.status(400).json({ message: 'Deadline cannot be in the past' });
      }
      //get the category id from the name
      const categoryData = await ProcurementCategory.findOne({
        where: { name: category },
      });
      if (!categoryData) {
        return res.status(400).json({ message: "Invalid category" });
      }
      //check if all requirements have a valid type
      if (requirements) {
        for (let req of requirements) {
          if (
            req.type !== "technical" &&
            req.type !== "legal" &&
            req.type !== "Legal" &&
            req.type !== "Technical"
          ) {
            return res
              .status(400)
              .json({
                message:
                  'Invalid requirement type. Must be either "technical" or "legal".',
              });
          }
        }
      }
      //update procurement request fields
      procurementRequest.title = title || procurementRequest.title;
      procurementRequest.description =
        description || procurementRequest.description;
      procurementRequest.deadline = deadline || procurementRequest.deadline;
      procurementRequest.budget_min =
        budget_min ?? procurementRequest.budget_min;
      procurementRequest.budget_max =
        budget_max || procurementRequest.budget_max;
      procurementRequest.category_id = categoryData.id;
      procurementRequest.status = status || procurementRequest.status;
      procurementRequest.location = location || procurementRequest.location;
      procurementRequest.bid_edit_deadline = bid_edit_deadline ? bid_edit_deadline: null;
      procurementRequest.updated_at = new Date();
  
      await procurementRequest.save({ transaction: t });
  
      const itemsParsed = items ? (typeof items === 'string' ? JSON.parse(items) : items) : [];
      if(itemsParsed.length > 0) {
        const itemsIDs = itemsParsed.filter(item => item.id).map(item => item.id);
        //check if items that need to be updated are in the db
        const existing = await ProcurementItem.findAll({ where: { id: { [Op.in]: itemsIDs }, procurement_request_id: procurementId } });
        if(existing.length !== itemsIDs.length) {
          await t.rollback();
          return res.status(400).json({ message: 'One or more item IDs are invalid' });
        }
        //delete items not in the new list
        await ProcurementItem.destroy({ where: { procurement_request_id: procurementId, id: { [Op.notIn]: itemsIDs } }, transaction: t });
        //update or create new items
        for(const item of itemsParsed) {
          if (item.id) {
            const existingItem = await ProcurementItem.findOne({ where: { id: item.id, procurement_request_id: procurementId }, transaction: t });
            if (existingItem) {//update existing item
              existingItem.title = item.title || existingItem.title;
              existingItem.description = item.description || existingItem.description;
              existingItem.quantity = item.quantity || existingItem.quantity;
              existingItem.updated_at = new Date();
              await existingItem.save({ transaction: t });
            }
          } else {//create new item
            await ProcurementItem.create({
              procurement_request_id: procurementId,
              title: item.title,
              description: item.description,
              quantity: item.quantity,
              created_at: new Date(),
              updated_at: new Date(),
            }, { transaction: t });
          }
        }
      }

      const requirementsParsed = requirements ? (typeof requirements === 'string' ? JSON.parse(requirements) : requirements) : [];
      //delete requirements that are not in the updated list and update existing ones
      if (requirementsParsed.length > 0) {
        const requirementIds = requirementsParsed.map(req => req.id);
        //check if requirements that need to be updated are in the db
        const existing = await Requirement.findAll({ where: { id: { [Op.in]: requirementIds }, procurement_request_id: procurementId } });
        if (existing.length !== requirementIds.length) {
          await t.rollback();
          return res.status(400).json({ message: 'One or more requirement IDs are invalid' });
        }
        await Requirement.destroy({ where: { procurement_request_id: procurementId, id: { [Op.notIn]: requirementIds } }, transaction: t });
        for (const req of requirementsParsed) {
          const typeToUse = req.type?.toLowerCase();
          if (typeToUse !== 'technical' && typeToUse !== 'legal') {
            await t.rollback();
            return res.status(400).json({ message: 'Invalid requirement type. Must be either "technical" or "legal".' });
          }
          if (req.id) {
            const existingReq = await Requirement.findOne({ where: { id: req.id, procurement_request_id: procurementId }, transaction: t });
            if (existingReq) {//update existing requirement
              existingReq.type = req.type || existingReq.type;
              existingReq.description = req.description || existingReq.description;
              existingReq.updated_at = new Date();
              await existingReq.save({ transaction: t });
            }
          } else {//create new requirement
            await Requirement.create({
              procurement_request_id: procurementId,
              type: req.type,
              description: req.description,
              created_at: new Date(),
              updated_at: new Date(),
            }, { transaction: t });
          }
        }
      }

      const evaluationCriteriaParsed = criteria ? (typeof criteria === 'string' ? JSON.parse(criteria) : criteria) : [];
      if(evaluationCriteriaParsed.length > 0) {
        const evaluationIDs = evaluationCriteriaParsed.filter(criteria => criteria.id).map(criteria => criteria.id);
        //check if evaluation criteria that need to be updated are in the db
        const existing = await EvaluationCriteria.findAll({where:{id:{[Op.in]: evaluationIDs}, procurement_request_id: procurementId}});
        if(existing.length !== evaluationIDs.length) {
          await t.rollback();
          return res.status(400).json({ message: 'One or more evaluation criteria IDs are invalid' });
        }
        const totalWeight = evaluationCriteriaParsed.reduce((sum, criteria) => sum + parseFloat(criteria.weight), 0);
        if (totalWeight !== 100) {
          await t.rollback();
          return res.status(400).json({ message: 'Total weight of all evaluation criteria must be exactly 100%' });
        }
        await EvaluationCriteria.destroy({ where: { procurement_request_id: procurementId, id: { [Op.notIn]: evaluationIDs } }, transaction: t });
        for (const criteria of evaluationCriteriaParsed) {
          const criteriaType = await CriteriaType.findOne({ where: { name: criteria.name } });
          if (!criteriaType) {
            await t.rollback();
            return res.status(400).json({ message: `Invalid criteria type: ${criteria.name}` });
          }
          if (criteria.id) {
            const existingCriteria = await EvaluationCriteria.findOne({ where: { id: criteria.id, procurement_request_id: procurementId }, transaction: t });
            if (existingCriteria) {//update existing criteria
              existingCriteria.criteria_type_id = criteriaType.id;
              existingCriteria.weight = parseFloat(criteria.weight);
              existingCriteria.is_must_have = criteria.is_must_have === true || criteria.is_must_have === 'true';
              existingCriteria.updated_at = new Date();
              await existingCriteria.save({ transaction: t });
            }

          } else {//create new criteria
            await EvaluationCriteria.create({
              procurement_request_id: procurementId,
              criteria_type_id: criteriaType.id,
              weight: parseFloat(criteria.weight),
              is_must_have: criteria.is_must_have === true || criteria.is_must_have === 'true',
              created_at: new Date(),
              updated_at: new Date(),
            }, { transaction: t });
          }
        }
      } 
        
      await t.commit();
      return res.status(200).json({
        message: "Procurement request updated successfully",
        procurementRequest,
      });
    } catch (error) {
      await t.rollback();
      console.error(error);
      return res
        .status(500)
        .json({ message: "Something went wrong", error: error.message });
    }
  },
  getProcurementRequestDetails: async (req, res) => {
  try {
    const procurementId = req.params.id;

    const procurementRequest = await ProcurementRequest.findOne({
      where: { id: procurementId },
      include: [
        { model: ProcurementItem, as: "items" },
        { model: Requirement, as: "requirements" },
        {
          model: ProcurementCategory,
          as: "procurementCategory",
          attributes: ["name"],
        },
        {
          model: EvaluationCriteria,
          as: 'evaluationCriteria',
          include: [
            {
              model: CriteriaType,
              as: 'criteriaType',
              attributes: ['name'],
            },
          ],
        },
      ]
    });

    if (!procurementRequest) {
      return res
        .status(404)
        .json({ message: "Procurement request not found" });
    }

    // Ako je request 'awarded', pronađi seller-a iz Contract-a
    let seller = null;

    if (procurementRequest.status === 'awarded') {
      const contract = await Contract.findOne({
        where: { procurement_request_id: procurementId },
        include: {
          model: ProcurementBid,
          as: 'bid',
          include: {
            model: User,
            as: 'seller',
            attributes: ['first_name', 'last_name']
          }
        }
      });

      if (contract && contract.bid && contract.bid.seller) {
        seller = {
          fullName: `${contract.bid.seller.first_name} ${contract.bid.seller.last_name}`
        };
      }
    }

    const response = {
      ...procurementRequest.toJSON(),
      ...(seller && { seller }), // Dodaj "seller" ako postoji
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching procurement request" });
  }
},

  getBidsForProcurement: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try{
      const procurement = await ProcurementRequest.findOne({where: { id }});
      if (!procurement) {
        return res.status(404).json({ message: 'Procurement request not found' });
      }
      if(procurement.buyer_id !== userId) {
        return res.status(403).json({ message: 'You are not authorized to view bids for this procurement request' });
      }
      const bids = await ProcurementBid.findAll({where: { procurement_request_id: id }});
      if (!bids || bids.length === 0) {
        return res.status(404).json({ message: 'No bids found for this procurement request' });
      }
      res.status(200).json(bids);
    }catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching bids for procurement request' });
    }

  },
  // GET route to fetch closed procurement requests without auctions for dropdown
  getClosedRequestsWithoutAuction: async (req, res) => {
    try {
      const buyerId = req.user.id;
      
      // First, check if the user is active
      if(req.user.status !== 'active') {
        return res.status(403).json({ 
          message: 'Your account is not active. Please contact support.' 
        });
      }
      
      // Get all closed procurement requests for this buyer that don't have auctions
      const requests = await ProcurementRequest.findAll({
        attributes: ['id', 'title'], // Only return id and title for dropdown
        where: {
          buyer_id: buyerId,
          status: 'closed',
          // Exclude those that already have auctions
          id: {
            [Op.notIn]: Sequelize.literal(`(
              SELECT COALESCE(procurement_request_id, 0) 
              FROM auctions
            )`)
          }
        },
        order: [['updated_at', 'DESC']] // Most recently closed first
      });
      
      return res.status(200).json({
        count: requests.length,
        requests: requests
      });
      
    } catch (error) {
      console.error('Error fetching closed requests without auctions:', error);
      return res.status(500).json({ 
        message: 'An error occurred while fetching procurement requests',
        error: error.message 
      });
    }
  },
};
