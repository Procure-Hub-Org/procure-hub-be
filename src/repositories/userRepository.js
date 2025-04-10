const {User: User} = require("../../database/models");

const updateUser = async(userId, updateInfo) => {
    const user = await User.findByPk(userId);

    if (!user) 
        throw new Error("User not found");

    await user.update(updateInfo);
    return user;
};

module.exports = {updateUser};