const express = require('express');
const controller = require('../controllers/adminController');
const db = require('../../database/models'); 
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

//kreiranje korisnika 
router.post('/admin/create-user', verifyToken, isAdmin, controller.createUserByAdmin);

//azuriranje korisnika
router.put('/admin/update/:id', verifyToken, isAdmin, controller.updateUserByAdmin);

module.exports = router;
