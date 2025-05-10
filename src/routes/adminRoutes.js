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

//updateovanje alertova i flagged statusa za sve procurement requestove
router.get('/admin/alerts/update', verifyToken, isAdmin, controller.updateAllAlerts);

//dobavljanje svih alertova za odredjeni bid
router.get('/admin/alerts/:id', verifyToken, isAdmin, controller.generateAlerts);

//key metrics for admin dashboard
router.get('/admin/analytics/overview', verifyToken, isAdmin, controller.getAnalytics);

//distribution of procurement requests by category
router.get('/admin/analytics/requests-by-categories', verifyToken, isAdmin, controller.getRequestsByCategories);

//average bids by category
router.get('/admin/analytics/avg-bids-by-category', verifyToken, isAdmin, controller.getAvgBidsByCategory);

//average time to award requests
router.get('/admin/analytics/avg-time-to-award', verifyToken, isAdmin, controller.getAvgTimeToAward);

//buyers withe highest number of frozen requests
router.get('/admin/analytics/top5-buyers-frozen', verifyToken, isAdmin, controller.getTop5BuyersFrozen);

//distribution of requests by status
router.get('/admin/analytics/requests-status-distribution', verifyToken, isAdmin, controller.getRequestsStatusDistribution);

//buyers with highest average price reduction
router.get('/admin/analytics/top5-buyers-price-reduction', verifyToken, isAdmin, controller.getTop5BuyersPriceReduction);

module.exports = router;
