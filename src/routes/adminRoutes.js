const express = require('express');
const controller = require('../controllers/adminController');
const db = require('../../database/models'); 
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

//kreiranje korisnika 
router.post('/admin/create-user', verifyToken, isAdmin, controller.createUserByAdmin);

//azuriranje korisnika
router.put('/admin/update/:id', verifyToken, isAdmin, controller.updateUserByAdmin);

router.get('/admin/procurements-requests', verifyToken, isAdmin, controller.getAllProcurementRequestsAsAdmin);

//dobavljanje svih bidova za odredjeni zahtjev za nabavku
router.get('/admin/procurement-bids/:id', verifyToken, isAdmin, controller.getBidLogsForProcurementRequest);

module.exports = router;
