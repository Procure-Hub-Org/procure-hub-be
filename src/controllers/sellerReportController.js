const db = require('../../database/models');
const { SuspiciousActivity } = db;

exports.getSellerReports = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userId = req.user.id;
    
    // Verify user is active
    if (req.user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact support.' 
      });
    }
    
    // Verify the requesting user is the same as the seller in the URL parameter
    if (parseInt(sellerId) !== userId) {
      return res.status(403).json({
        message: 'You are not authorized to access reports for this seller'
      });
    }
    
    // Get all suspicious activity reports created by this seller
    const reports = await SuspiciousActivity.findAll({
      where: {
        seller_id: sellerId
      },
      attributes: ['id', 'procurement_request_id'],
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({
      message: 'Suspicious activity reports retrieved successfully',
      reports
    });
    
  } catch (error) {
    console.error('Error fetching seller reports:', error);
    return res.status(500).json({ 
      message: 'Something went wrong', 
      error: error.message 
    });
  }
};