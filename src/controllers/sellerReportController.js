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

// Create a new suspicious activity report
exports.createSuspiciousActivity = async (req, res) => {
  try {
    const { procurement_request_id, text } = req.body;
    const seller_id = req.user.id;
    
    // Check if user is active
    if (req.user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Your account is not active. Please contact support.' 
      });
    }
    
    // Validate required fields
    if (!procurement_request_id || !text) {
      return res.status(400).json({
        message: 'Procurement request ID and text are required'
      });
    }
    
    // Check if the procurement request exists
    const procurementRequest = await ProcurementRequest.findByPk(procurement_request_id);
    if (!procurementRequest) {
      return res.status(404).json({
        message: 'Procurement request not found'
      });
    }
    
    // Check if a report from this seller for this procurement already exists
    const existingReport = await SuspiciousActivity.findOne({
      where: {
        seller_id,
        procurement_request_id
      }
    });
    
    if (existingReport) {
      return res.status(400).json({
        message: 'You have already reported this procurement request'
      });
    }
    
    // Create the new suspicious activity report
    const newReport = await SuspiciousActivity.create({
      seller_id,
      procurement_request_id,
      text,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return res.status(201).json({
      message: 'Suspicious activity report created successfully',
      report: {
        id: newReport.id,
        procurement_request_id: newReport.procurement_request_id
      }
    });
    
  } catch (error) {
    console.error('Error creating suspicious activity report:', error);
    return res.status(500).json({ 
      message: 'Something went wrong', 
      error: error.message 
    });
  }
};