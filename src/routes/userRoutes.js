const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController.js');
const profileController = require("../controllers/profileController");

const authMiddleware = require("../middleware/authMiddleware"); // provjera ulogovanog korisnika 
const upload = require("../middleware/uploadMiddleware"); // middleware za upload slika
const { registerValidator } = require('../middleware/userValidator.js');

router.post('/user/register', registerValidator, userController.register);
router.put("/user/profile", authMiddleware, 
    upload.fields([
     {name: "profile_picture", maxCount: 1},
     {name: "company_logo", maxCount: 1},
    ]),
    profileController.updateProfile
 );

module.exports = router;