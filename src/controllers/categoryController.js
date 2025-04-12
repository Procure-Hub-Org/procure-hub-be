const { ProcurementCategory } = require('../../database/models/');

const getAllProcurementCategories = async (req, res) => {
  try {
    const categories = await ProcurementCategory.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Failed to fetch procurement categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllProcurementCategories };
