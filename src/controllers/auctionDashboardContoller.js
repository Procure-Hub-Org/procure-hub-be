const { getBuyerDashboard } = require('../services/dashboardService.js');
const { getSellerDashboard } = require('../services/dashboardService.js');
const { getAdminDashboard } = require('../services/dashboardService.js');

// Razdvajanje po ulogama
const getDashboard = async (req, res) => {
    try {
      const role = req.user.role;
      const userId = req.user.id;

      if (role === 'admin') {
        const adminData = await getAdminDashboard(userId);
        return res.status(200).json(adminData);
      }
  
      if (role === 'buyer') {
        const buyerData = await getBuyerDashboard(userId);
        return res.status(200).json(buyerData);
      }
  
      if (role === 'seller') {
        const sellerData = await getSellerDashboard(userId);
        return res.status(200).json(sellerData);
      }

      return res.status(403).json({ error: 'Unauthorized role' });
    } 
    catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };


module.exports = { getDashboard };