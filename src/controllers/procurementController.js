const { Op } = require('sequelize');
const { ProcurementRequest } = require('../../database/models'); // adjust path as needed

exports.getOpenProcurementRequests = async (req, res) => {
  try {
    // Start with a filter that returns only open requests
    let filters = { status: "open" };

    // Extract filters from query parameters
    const { category, deadline, buyerType, location, budget } = req.query;

    if (category) {
      filters.category = category;
    }
    if (buyerType) {
      filters.buyerType = buyerType;
    }
    if (location) {
      filters.location = location;
    }
    // Assume "deadline" is provided as a date string, e.g., '2025-05-01'
    if (deadline) {
      filters.deadline = { [Op.gte]: new Date(deadline) };
    }
    // Assume "budget" is provided as a number (string that can be converted to number)
    if (budget) {
      filters.budget = { [Op.lte]: Number(budget) };
    }

    // Fetch requests from the database with the defined filters
    const requests = await ProcurementRequest.findAll({
      where: filters,
      // Optionally, you can specify which attributes to return:
      // attributes: ['id', 'title', 'category', 'deadline', 'buyerType', 'location', 'budget']
    });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching procurement requests:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
