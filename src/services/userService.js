const userRepository = require("../repositories/userRepository");

const updateUserProfile = async (userId, updateInfo) => {

    // Filter the update information to only allowed fields
    const allowedFields = [
        "first_name", "last_name", "phone_number",
        "address", "company_name", "bio", "company_address"
    ];

    const filteredUpdate = {};
    allowedFields.forEach(field => {
        if (updateInfo[field] !== undefined) {
            filteredUpdate[field] = updateInfo[field];
        }
    });

    // Handle profile picture if it's uploaded
    if (updateInfo.profile_picture) {
        filteredUpdate.profile_picture = updateInfo.profile_picture;
    }

    return await userRepository.updateUser(userId, updateInfo);
};

module.exports = { updateUserProfile };