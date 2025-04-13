const db = require("../../database/models");

exports.addToFavorites = async (userId, requestId) => {
  try {
    const favorite = await db.Favorite.create({
      user_id: userId,
      procurement_request_id: requestId,
    });
    return favorite;
  } catch (error) {
    console.error("Error adding to favorites: ", error);
    return null;
  }
};

exports.removeFromFavorites = async (userId, requestId) => {
  try {
    const favorite = await db.Favorite.destroy({
      where: {
        user_id: userId,
        procurement_request_id: requestId,
      },
    });
    return favorite;
  } catch (error) {
    console.error("Error removing from favorites: ", error);
    return false;
  }
};

exports.existsInFavorites = async (userId, requestId) => {
    try {
        const favorite = await db.Favorite.findOne({
        where: {
            user_id: userId,
            procurement_request_id: requestId,
        },
        });
        return favorite !== null;
    } catch (error) {
        console.error("Error checking favorites: ", error);
        return false;
    }
};

exports.getFavorites = async (userId) => {
  try {
    const favorites = await db.Favorite.findAll({
      where: { user_id: userId },
      include: [{
        model: db.ProcurementRequest,
        as: 'procurementRequest'
      }],
      order: [['created_at', 'DESC']],
    });
    return favorites;
  } catch (error) {
    console.error("Error fetching favorites: ", error);
    return null;
  }
}