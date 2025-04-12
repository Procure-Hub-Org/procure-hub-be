const procurementRequestService = require("../services/procurementRequestService");

exports.follow = async (req, res) => {
    const sellerId = req.user.id;
    const requestId = req.params.id;

    try {
        const favorite = await procurementRequestService.addFavorite(sellerId, requestId);
        if (favorite) {
            return res.status(200).json({ message: "Followed successfully", favorite });
        } else {
            return res.status(400).json({ message: "Already followed" });
        }
    } catch (error) {
        console.error("Error following request: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.unfollow = async (req, res) => {
    const sellerId = req.user.id;
    const requestId = req.params.id;

    try {
        const removed = await procurementRequestService.removeFavorite(sellerId, requestId);
        if (removed) {
            return res.status(200).json({ message: "Unfollowed successfully" });
        } else {
            return res.status(400).json({ message: "Already unfollowed" });
        }
    } catch (error) {
        console.error("Error unfollowing request: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

exports.getFavorites = async (req, res) => {
    const userId = req.user.id;
    try {
        const favorites = await procurementRequestService.getFavorites(userId);
        if (!favorites) {
            return res.status(404).json({ message: "No favorites found" });
        }
        return res.status(200).json(favorites);
    } catch (error) {
        console.error("Error fetching favorites: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}