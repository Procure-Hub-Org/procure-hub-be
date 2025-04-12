const favoriteRepository = require("../repositories/favoriteRepository");

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
    return await favoriteRepository.getFavorites(userId);
};