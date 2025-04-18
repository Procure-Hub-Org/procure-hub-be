const { ProcurementRequest, ProcurementItem, Requirement, ProcurementCategory, User, ProcurementBid, CriteriaType, EvaluationCriteria } = require('../../database/models');

module.exports = {
  createProcurementRequest: async (req, res) => {
    const t = await ProcurementRequest.sequelize.transaction();
    try {
      // Provjera uloge korisnika
      const user = await User.findByPk(req.user.id);
      if (!user || user.role !== 'buyer') {
        return res.status(403).json({ message: 'You do not have the required role to create a procurement request' });
      }
      if(user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
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
        items,
        requirements,
        evaluationCriteria,
        /*documentation, // Ovdje uzimamo URL iz tijela zahtjeva*/
      } = req.body;
      const itemsParsed = items ? (typeof items === 'string' ? JSON.parse(items) : items) : [];
      const requirementsParsed = requirements ? (typeof requirements === 'string' ? JSON.parse(requirements) : requirements) : [];
      
      const categoryData = await ProcurementCategory.findOne({ where: { name: category } });
      if (!categoryData) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      const categoryId = categoryData.id;

      // Ako postoji URL za dokumentaciju, koristimo ga, inače null
      //const documentPath = req.file ? req.file.path : null;

      // Ako je status 'active', sve mora biti popunjeno
      if (status === 'active') {
        if (!title || !description || !deadline || !budget_min || !budget_max || !category || !location || !items || items.length === 0) {
        return res.status(400).json({
          message: 'All fields and at least one item are required when status is active',
          });
        }
      }
      //provjera validnosti budget_min i budget_max
      if (budget_min < 0 || budget_max < 0) {
        return res.status(400).json({ message: 'Budgets cannot be negative' });
      }
      if (budget_max < budget_min) {
        return res.status(400).json({ message: 'Maximum budget cannot be less than minimum budget' });
      }
      if (budget_min === budget_max) {
        return res.status(400).json({ message: 'Minimum and maximum budget cannot be the same' });
      }
      //ne moze se kreirati zahtjev sa statusom closed ili awarded
     { /*if(status === 'closed' && status !== 'awarded') {
        return res.status(400).json({ message: 'Procurement request cannot be created with status closed or awarded' }); 
      }*/}
      // Provjera datuma
      if (deadline < new Date()) {
        return res.status(400).json({ message: 'Deadline cannot be in the past' }); 
      }
      //provjera validnosti za requirements type
      if (requirementsParsed) {
        for (let req of requirementsParsed) {
          if (req.type !== 'technical' && req.type !== 'legal' && req.type !== 'Legal' && req.type !== 'Technical') {
            return res.status(400).json({ message: 'Invalid requirement type. Must be either "technical" or "legal".' });
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
        return res.status(400).json({ message: 'At least one item must be provided' });
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
      const evaluationParsed = evaluationCriteria ? (typeof evaluationCriteria === 'string' ? JSON.parse(evaluationCriteria) : evaluationCriteria) : [];

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
        message: 'Procurement request created successfully',
        procurementRequest
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
  },
  updateProcurementRequestStatus: async (req, res) => {
    try {
      const id = req.params.id; // procurement request id
      console.log(req.body);
      const {status} = req.body; //new status
      const userId = req.user.id; 
      console.log("user id", userId)
      //check if the user status is active
      if(req.user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
      }
      //check if the status is valid
      const validStatuses = ['active', 'closed', 'draft', 'awarded', 'freezed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }
      //procurement request id
      const procurementRequest = await ProcurementRequest.findByPk(id);
      //check if the procurement request exists
      if (!procurementRequest) {
        return res.status(404).json({ message: 'Procurement request not found' });
      }
      //check if the logged-in user is the buyer who created this procurement request
      if (procurementRequest.buyer_id !== userId) {
        return res.status(403).json({ message: 'You are not authorized to change the status of this procurement' });
      }
      //if the current status is the same as new status no need to update
      if (procurementRequest.status === status) {
        return res.status(400).json({ message: 'Status is already set to the requested value' });
      }
      //allowed status transitions 
      const allowedTransitions = {
      draft: ['active'],
      active: ['closed', 'freezed'],
      freezed: ['active', 'closed'],
      closed: ['awarded'],
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

      res.status(200).json({ message: 'Procurement request status updated successfully', procurementRequest });
    }catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
  },

  updateProcurementRequest: async (req, res) => {
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
      } = req.body;
  
      const procurementRequest = await ProcurementRequest.findOne({ where: { id: procurementId } });
      if (!procurementRequest) {
        return res.status(404).json({ message: 'Procurement request not found' });
      }
  
      //check if the logged-in user is the buyer who created this procurement request
      if (procurementRequest.buyer_id !== userId) {
        return res.status(403).json({ message: 'You are not authorized to update this procurement request' });
      }
      //check if the user is active
      if (req.user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active' });
      }
      //this statuses cannot be set through this route
      if (status && ['closed', 'awarded', 'freezed'].includes(status)) {
        return res.status(400).json({ message: 'Cannot set status to closed, awarded or freezed through this route' });
      }
      //only procurements with draftstatus can be updated
      if (procurementRequest.status !== 'draft') {
        return res.status(400).json({ message: 'Only procurement requests with draft status can be updated' });
      }
      //if the new status is active all fields must be filled
      if (status === 'active') {
        if (!(title || procurementRequest.title) ||!(description || procurementRequest.description) ||!(deadline || procurementRequest.deadline) ||
          !(budget_min !== undefined || procurementRequest.budget_min !== null) ||!(budget_max !== undefined || procurementRequest.budget_max !== null) ||
          !(category || procurementRequest.category_id) ||!(location || procurementRequest.location)
        ) {
          return res.status(400).json({ message: 'All fields are required when setting status to active' });
        }
      
        const itemsParsed = items ? (typeof items === 'string' ? JSON.parse(items) : items) : [];
        const existingItems = await ProcurementItem.findAll({ where: { procurement_request_id: procurementId } });
        if (itemsParsed.length === 0 && existingItems.length === 0) {
          return res.status(400).json({ message: 'At least one item is required when setting status to active' });
        }
      }      
      if (budget_min !== undefined && budget_min < 0) {
        return res.status(400).json({ message: 'Minimum budget cannot be negative' });
      }
  
      if (budget_max !== undefined && budget_max < 0) {
        return res.status(400).json({ message: 'Maximum budget cannot be negative' });
      }
  
      const finalMin = budget_min !== undefined ? budget_min : procurementRequest.budget_min;
      const finalMax = budget_max !== undefined ? budget_max : procurementRequest.budget_max;
  
      if (finalMin >= finalMax) {
        return res.status(400).json({ message: 'Minimum budget must be less than maximum budget' });
      }
  
    //check if the date is in the past
    if (deadline && new Date(deadline) < new Date()) {
      return res.status(400).json({ message: 'Deadline cannot be in the past' });
    }
    //validation for category
    let categoryId = procurementRequest.category_id;
    if (category) {
      const categoryData = await ProcurementCategory.findOne({ where: { name: category } });
      if (!categoryData) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      categoryId = categoryData.id;
    }
    if (title) procurementRequest.title = title;
    if (description) procurementRequest.description = description;
    if (deadline) procurementRequest.deadline = deadline;
    if (budget_min !== undefined) procurementRequest.budget_min = budget_min;
    if (budget_max !== undefined) procurementRequest.budget_max = budget_max;
    if (categoryId) procurementRequest.category_id = categoryId;
    if (status) procurementRequest.status = status;
    if (location) procurementRequest.location = location;
    procurementRequest.updated_at = new Date();

    await procurementRequest.save();
    const itemsParsed = items ? (typeof items === 'string' ? JSON.parse(items) : items) : [];

    if (itemsParsed.length > 0) {
      const existingItems = await ProcurementItem.findAll({ where: { procurement_request_id: procurementId } });

      for (const item of itemsParsed) {
        if (item.id) {
          const existingItem = existingItems.find(i => i.id === item.id);
          if (existingItem) {
            existingItem.title = item.title || existingItem.title;
            existingItem.description = item.description || existingItem.description;
            existingItem.quantity = item.quantity || existingItem.quantity;
            existingItem.updated_at = new Date();
            await existingItem.save();
          } else {
            return res.status(400).json({ message: `Item ID ${item.id} not found` });
          }
        } else {
          if (!item.title || !item.description || !item.quantity) {
            return res.status(400).json({ message: 'Title, description and quantity are required for new items' });
          }

          await ProcurementItem.create({
            procurement_request_id: procurementId,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    }
    const requirementsParsed = requirements ? (typeof requirements === 'string' ? JSON.parse(requirements) : requirements) : [];

    if (requirementsParsed.length > 0) {
      const existingRequirements = await Requirement.findAll({ where: { procurement_request_id: procurementId } });

      for (const req of requirementsParsed) {
        if (req.id) {
          const existingReq = existingRequirements.find(r => r.id === req.id);
          if (existingReq) {
            if (req.type && !['technical', 'legal'].includes(req.type.toLowerCase())) {
              return res.status(400).json({ message: 'Requirement type must be "technical" or "legal"' });
            }
            existingReq.type = req.type || existingReq.type;
            existingReq.description = req.description || existingReq.description;
            existingReq.updated_at = new Date();
            await existingReq.save();
          } else {
            return res.status(400).json({ message: `Requirement ID ${req.id} not found` });
          }
        } else {
          if (!req.type || !req.description) {
            return res.status(400).json({ message: 'Type and description are required for new requirements' });
          }
          await Requirement.create({
            procurement_request_id: procurementId,
            type: req.type,
            description: req.description,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }
    }
    return res.status(200).json({message: 'Procurement request updated successfully',procurementRequest});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
  },  

  getProcurementRequestDetails: async (req, res) => {
    try{
      const procurementId = req.params.id;
      const procurementRequest = await ProcurementRequest.findOne({
        where: { id: procurementId },
        include: [
          { model: ProcurementItem, as: 'items' },
          { model: Requirement, as: 'requirements' },
          { 
            model: ProcurementCategory, 
            as: 'procurementCategory', 
            attributes: ['name'],
          },
        ]
      });
      
      if (!procurementRequest) {
        return res.status(404).json({ message: 'Procurement request not found' });
      }
      
    res.status(200).json(procurementRequest);
    } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching procurement request' });
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
};
