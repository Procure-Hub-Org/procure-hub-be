const procurementRequestRepository = require('../repositories/procurementRequestRepository');
const db = require('../../database/models');
const favoriteRepository = require("../repositories/favoriteRepository");


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
    
    /*return requests.map(request => {
      const plain = request.get({ plain: true });

      plain.procurementCategory = plain.procurementCategory?.name || null;

      return plain;
    });*/
    return requests;
}

exports.addFavorite = async (userId, requestId) => {
    const exists = await favoriteRepository.existsInFavorites(userId, requestId);
    if (exists) return false;

    return await favoriteRepository.addToFavorites(userId, requestId);
};

exports.removeFavorite = async (userId, requestId) => {
    const exists = await favoriteRepository.existsInFavorites(userId, requestId);
    if (!exists) return false;

    const removed = await favoriteRepository.removeFromFavorites(userId, requestId);

    return removed > 0;
};

exports.getFavorites = async (userId) => {
    const favorites = await favoriteRepository.getFavorites(userId);
    if (!favorites) return null;

    const procurementRequests = favorites.map(favorite => {
        const procurement = favorite.procurementRequest.get({ plain: true });
        const category_name = procurement.procurementCategory?.name || null;
        const buyer_full_name = procurement.buyer?.first_name + procurement.buyer?.last_name || null;

        delete procurement.procurementCategory;
        delete procurement.buyer;

        return {
          ...procurement,
          category_name,
          buyer_full_name
        };
    });
    return procurementRequests;
};