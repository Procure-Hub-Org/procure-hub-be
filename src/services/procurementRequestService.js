const procurementRequestRepository = require('../repositories/procurementRequestRepository');
const db = require('../../database/models');

exports.getBuyerProcurementRequests = async (buyerId) => {
    let queryOptions = {
        include: [
          {
            model: db.ProcurementCategory,
            as: 'procurementCategory',
            attributes: ['name']
          }
        ],
        where: { buyer_id: buyerId },
        order: [['created_at', 'DESC']]
    };

    const requests = await procurementRequestRepository.getProcurementRequests(queryOptions); 
    
    return requests.map(request => {
      const plain = request.get({ plain: true });

      plain.procurementCategory = plain.procurementCategory?.name || null;

      return plain;
  });
}