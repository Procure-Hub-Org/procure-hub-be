const userService = require("../services/userService");
const buyerTypeController = require("./buyerTypeController");
const supabaseBucketService = require("../services/supabaseBucketService");
const path = require("path");
const crypto = require("crypto");

const updateProfile = async (req, res) => {
  if (req.fileValidationError) {
    return res.status(400).json({ message: req.fileValidationError });
  }
  try {
    // Uzima id iz JWT
    const userId = req.user.id;
    const updateInfo = req.body;
    console.log("Update info: from controller", updateInfo);
    if (req.files?.profile_picture) {
      const extension = path.extname(req.files.profile_picture[0].originalname);
      const uniqueName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const destinationPath = `photos/user_${userId}_profile_picture_${uniqueName}${extension}`;
      const result = await supabaseBucketService.uploadFile(req.files.profile_picture[0].buffer, req.files.profile_picture[0].mimetype, destinationPath);
      if (!result) {
        console.error("Failed to upload file to Supabase");
      } else {
        if (req.user.profile_picture) {
          const oldProfilePicturePath = req.user.profile_picture;
          const deleteResult = await supabaseBucketService.deleteFile(oldProfilePicturePath);
          if (!deleteResult) {
            console.error("Failed to delete old profile picture from Supabase");
          }
        }

        updateInfo.profile_picture = destinationPath;
      }
    }
    if (req.files?.company_logo) {
      const extension = path.extname(req.files.company_logo[0].originalname);
      const uniqueName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const destinationPath = `photos/user_${userId}_company_logo_${uniqueName}${extension}`;
      const result = await supabaseBucketService.uploadFile(req.files.company_logo[0].buffer, req.files.company_logo[0].mimetype, destinationPath);
      if (!result) {
        console.error("Failed to upload file to Supabase");
        updateInfo.company_logo = "";
      } else {
        if (req.user.company_logo) {
          const oldCompanyLogoPath = req.user.company_logo;
          const deleteResult = await supabaseBucketService.deleteFile(oldCompanyLogoPath);
          if (!deleteResult) {
            console.error("Failed to delete old profile picture from Supabase");
          }
        }

        updateInfo.company_logo = destinationPath;
      }
    }

    const updatedUser = await userService.updateUserProfile(userId, updateInfo);

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Update profile failed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = req.user;
    const {
      password_hash,
      suspended_at,
      approved_at,
      admin_id,
      buyer_type_id,
      updated_at,
      created_at,
      createdAt,
      updatedAt,
      ...safeUser
    } = user.dataValues;

    const buyerTypeId = user.dataValues.buyer_type_id;
    const buyerType = buyerTypeId
      ? await buyerTypeController.getBuyerTypeById(buyerTypeId)
      : null;

    if (safeUser.profile_picture) {
      const signedUrl = await supabaseBucketService.getSignedUrl(safeUser.profile_picture);
      safeUser.profile_picture_url = signedUrl;
    }

    if (safeUser.company_logo) {
      const signedUrl = await supabaseBucketService.getSignedUrl(safeUser.company_logo);
      safeUser.company_logo_url = signedUrl;
    }

    res.status(200).json({ user: safeUser, buyer_type: buyerType });
  } catch (error) {
    console.error("Failed to get profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { updateProfile, getProfile };
