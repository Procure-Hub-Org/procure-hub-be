const { ProcurementRequest, ProcurementItem, Requirement, ProcurementCategory, User } = require('../../database/models');

module.exports = {
  createProcurementRequest: async (req, res) => {
    try {
      // Provjera uloge korisnika
      const user = await User.findByPk(req.user.id);
      if (!user || user.role !== 'buyer') {
        return res.status(403).json({ message: 'You do not have the required role to create a procurement request' });
      }

      // Destrukturiranje podataka iz tijela zahtjeva — bez buyer_id!
      const {
        title,
        description,
        deadline,
        budget_min,
        budget_max,
        category_id,
        status,
        location,
        items,
        requirements,
        documentation, // Ovdje uzimamo URL iz tijela zahtjeva
      } = req.body;

      // Provjera kategorije
      const category = await ProcurementCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }

      // Ako postoji URL za dokumentaciju, koristimo ga, inače null
      const documentationUrl = documentation || null;

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
        category_id: category.id,
        status,
        location,
        documentation: documentationUrl, // Pohranjujemo URL dokumentacije
        created_at,
        updated_at,
      }, {
        returning: [
          'id', 'buyer_id', 'title', 'description', 'deadline', 'budget_min',
          'budget_max', 'category_id', 'status', 'location', 'documentation',
          'created_at', 'updated_at'
        ]
      });

      // Dodavanje stavki ako postoje
      if (items && items.length > 0) {
        await ProcurementItem.bulkCreate(
          items.map((item) => ({
            procurement_request_id: procurementRequest.id,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            created_at,
            updated_at,
          }))
        );
      }

      // Dodavanje zahtjeva ako postoje
      if (requirements && requirements.length > 0) {
        await Requirement.bulkCreate(
          requirements.map((requirement) => ({
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
};
