const db = require('../../database/models');
const User = db.User;
const approveUser = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    user.status = 'active';
    user.approved_at = new Date();
    await user.save();
    return user;
};

const deleteUser = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    await user.destroy();
};

const suspendUser = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');
    user.status = 'suspended';
    user.suspended_at = new Date();
    await user.save();
    return user;
};

module.exports = {
    approveUser,
    deleteUser,
    suspendUser,
};