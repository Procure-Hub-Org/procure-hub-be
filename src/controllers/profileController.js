const userService = require("../services/userService");

const updateProfile = async (req, res) => {
    try {
        
        // Uzima id iz JWT
        const userId = req.user.id;
        const updateInfo = req.body;

        if (req.files?.profile_picture) {
             updateInfo.profile_picture = `uploads/${req.files.profile_picture[0].filename}`;
        }
        if (req.files?.company_logo) {
            updateInfo.company_logo = `uploads/${req.files.company_logo[0].filename}`;
        }
        
        const updatedUser = await userService.updateUserProfile(userId, updateInfo);

        res.status(200).json({message: "Profile updated successfully"});
    }
    catch(error) {
        console.error("Update profile failed:", error);
        res.status(500).json({error: "Internal server error"});
    }
}

const getProfile = async (req, res) => {
    try {
      const user = req.user;
  
      const { password_hash, suspended_at, approved_at, admin_id, updated_at, created_at, createdAt, updatedAt, ...safeUser } = user.dataValues;
      
      res.status(200).json({ user: safeUser });
  
    } catch (error) {
      console.error('Failed to get profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

module.exports = { updateProfile, getProfile };