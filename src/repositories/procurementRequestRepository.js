const db = require('../../database/models');

exports.getProcurementRequests = async (queryOptions) => {
    try {
        const requests = await db.ProcurementRequest.findAll(queryOptions);
        return requests;
    } catch (error) {
        console.error('Error fetching procurement requests:', error);
        return null;
    }
}
