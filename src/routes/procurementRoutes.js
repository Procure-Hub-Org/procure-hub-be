const express = require('express');
const procurementController = require('../controllers/procurementController');
const { verifyToken, isSeller } = require('../middleware/authMiddleware'); // adjust if your middleware naming differs

const router = express.Router();

// GET all open procurement requests for sellers.
// This endpoint uses query parameters (category, deadline, buyerType, location, budget)
// to allow filtering of the results.
router.get(
  '/procurement-requests',
  verifyToken,      // Verify that the user is logged in
  isSeller,         // Ensure that only sellers can access (if applicable)
  procurementController.getOpenProcurementRequests
);

module.exports = router;
