const { ProcurementRequest, ProcurementItem, Requirement, ProcurementCategory, User } = require('../../database/models');

module.exports = {
  createProcurementRequest: async (req, res) => {
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
        documentation, // Ovdje uzimamo URL iz tijela zahtjeva
      } = req.body;
      const itemsParsed = items ? (typeof items === 'string' ? JSON.parse(items) : items) : [];
      const requirementsParsed = requirements ? (typeof requirements === 'string' ? JSON.parse(requirements) : requirements) : [];
      
      const categoryData = await ProcurementCategory.findOne({ where: { name: category } });
      if (!categoryData) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      const categoryId = categoryData.id;

      // Ako postoji URL za dokumentaciju, koristimo ga, inače null
      const documentPath = req.file ? req.file.path : null;

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
      if(status === 'closed' && status !== 'awarded') {
        return res.status(400).json({ message: 'Procurement request cannot be created with status closed or awarded' }); 
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
        documentation: documentPath, // Pohranjujemo URL dokumentacije
        created_at,
        updated_at,
      });
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
          }))
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
          }))
        );
      }

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
      const validStatuses = ['active', 'closed', 'draft', 'awarded'];
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
      //check if the status can be changed from current status to new status
      if (procurementRequest.status === 'draft' && status != 'active') {
        return res.status(400).json({ message: 'Status from draft can only be changed to active' });
      }if (procurementRequest.status === 'active' && status != 'awarded' && status != 'closed') {
        return res.status(400).json({ message: 'Status from active can only be change to awarded or closed' });
      }if(procurementRequest.status === 'awarded' || procurementRequest.status === 'closed'){
        return res.status(400).json({ message: 'Status cannot be changed from awarded or closed' });
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
        documentation,
      } = req.body;
  
      const procurementRequest = await ProcurementRequest.findOne({ where: { id: procurementId } });
      if (!procurementRequest) {
        return res.status(404).json({ message: 'Procurement request not found' });
      }
      //only the buyer who created this procurement request can update it
      if (procurementRequest.buyer_id !== userId) {
        return res.status(403).json({ message: 'You are not authorized to update this procurement request' });
      }
      if(req.user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
      }
      //check if the new status is valid
      if (status === 'closed' || status === 'awarded') {
        return res.status(400).json({ message: 'Cannot set status to closed or awarded through this route' });
      }
      if (procurementRequest.status != 'draft'){
        return res.status(400).json({ message: 'Cannot update procurement with status active, update or awarded.' });
      }
      //if the new status s active all fields must be filled
      if (status === 'active') {
        if (!title || !description || !deadline || !budget_min || !budget_max || !category || !location || !items || items.length === 0) {
          return res.status(400).json({message: 'All fields and at least one item are required when setting status to active',});
        }
      } 
      //check if the budget is valid
      if (budget_min < 0 || budget_max < 0) {
        return res.status(400).json({ message: 'Budgets cannot be negative' });
      }
      if (budget_max < budget_min) {
        return res.status(400).json({ message: 'Maximum budget cannot be less than minimum budget' });
      }
      if (budget_min === budget_max) {
        return res.status(400).json({ message: 'Minimum and maximum budget cannot be the same' });
      }
      //get the category id from the name
      const categoryData = await ProcurementCategory.findOne({ where: { name: category } });
      if (!categoryData) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      //check if all requirements have the valid type
      if (requirements) {
        for (let req of requirements) {
          if (req.type !== 'technical' && req.type !== 'legal' && req.type !== 'Legal' && req.type !== 'Technical') {
            return res.status(400).json({ message: 'Invalid requirement type. Must be either "technical" or "legal".' });
          }
        }
      }
      // Ako postoji URL za dokumentaciju, koristimo ga, inače null
      const documentPath = req.file ? req.file.path : null;
      //update procurement request fields
      procurementRequest.title = title || procurementRequest.title;
      procurementRequest.description = description || procurementRequest.description;
      procurementRequest.deadline = deadline || procurementRequest.deadline;
      procurementRequest.budget_min = budget_min ?? procurementRequest.budget_min;
      procurementRequest.budget_max = budget_max || procurementRequest.budget_max;
      procurementRequest.category_id = categoryData.id;
      procurementRequest.status = status || procurementRequest.status;
      procurementRequest.location = location || procurementRequest.location;
      procurementRequest.documentation = documentPath || procurementRequest.documentation;
      procurementRequest.updated_at = new Date();
  
      await procurementRequest.save();
  
      const itemsParsed = items ? (typeof items === 'string' ? JSON.parse(items) : items) : [];
      const requirementsParsed = requirements ? (typeof requirements === 'string' ? JSON.parse(requirements) : requirements) : [];

      //delete old items and create new ones
      if (itemsParsed.length > 0) {
        await ProcurementItem.destroy({ where: { procurement_request_id: procurementId } });
        await ProcurementItem.bulkCreate(
          itemsParsed.map(item => ({
            procurement_request_id: procurementId,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            created_at: new Date(),
            updated_at: new Date()
          }))
        );
      }

      //delete old requirements and create new ones
      await Requirement.destroy({ where: { procurement_request_id: procurementId } });
      if (requirementsParsed.length > 0) {
        await Requirement.bulkCreate(
          requirementsParsed.map(req => ({
            procurement_request_id: procurementId,
            type: req.type,
            description: req.description,
            created_at: new Date(),
            updated_at: new Date()
          }))
        );
      }
      return res.status(200).json({
        message: 'Procurement request updated successfully',
        procurementRequest
      });
  
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
  },  
};
