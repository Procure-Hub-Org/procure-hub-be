const userService = require("../services/userService");

const updateProfile = async (req, res) => {
    try {
        
        // Uzima id iz JWT
        const userId = req.user.id;
        const updateInfo = req.body;

        if (req.files?.profile_picture) {
             updateInfo.profile_picture = req.files.profile_picture[0].path; 
        }
        if (req.files?.company_logo) {
            updateInfo.company_logo = req.files.company_logo[0].path; 
        }
        
        const updatedUser = await userService.updateUserProfile(userId, updateInfo);

        res.status(200).json({message: "Profile updated successfully"});
    }
    catch(error) {
        console.error("Update profile failed:", error);
        res.status(500).json({error: "Internal server error"});
    }
}

module.exports = { updateProfile };