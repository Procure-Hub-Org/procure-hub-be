const userService = require('../services/service');

const approveUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await userService.approveUser(userId);
        res.status(200).json({ message: 'User approved successfully', data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        await userService.deleteUser(userId);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const suspendUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await userService.suspendUser(userId);
        res.status(200).json({ message: 'User suspended successfully', data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    approveUser,
    deleteUser,
    suspendUser,
};