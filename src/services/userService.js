const userRepository = require("../repositories/userRepository");

const updateUserProfile = async (userId, updateInfo) => {
  // Dozvoljena polja za setup
  const allowedFields = [
    "first_name",
    "last_name",
    "phone_number",
    "address",
    "company_name",
    "bio",
    "company_address",
    "buyer_type_id",
  ];

  const filteredUpdate = {};
  allowedFields.forEach((field) => {
    if (updateInfo[field] !== undefined) {
      filteredUpdate[field] = updateInfo[field];
    }
  });

  // Ukoliko se promijeni slika
  if (updateInfo.profile_picture) {
    filteredUpdate.profile_picture = updateInfo.profile_picture;
  }

  return await userRepository.updateUser(userId, updateInfo);
};

module.exports = { updateUserProfile };
