const procurementRequestService = require('../services/procurementRequestService');

exports.getBuyerProcurementRequests = async (req, res) => {
    try {
        const currentUser = req.user;
        console.log('Current user:', currentUser);

        if (currentUser.role !== 'buyer') {
            return res.status(403).json({ error: 'Authenticated user is not a buyer' });
        }
        
        requests = await procurementRequestService.getBuyerProcurementRequests(currentUser.id);
        if (!requests) {
            return res.status(404).json({ message: 'No procurement requests found' });
        }

        res.status(200).json({ requests });
      } catch (error) {
        console.error('Error fetching procurement requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}