const { CriteriaType } = require('../../database/models');

const getAllCriteriaTypes = async (req, res) => {
  try {
    const criterias = await CriteriaType.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    res.status(200).json({ success: true, data: criterias });
  } catch (error) {
    console.error('Failed to fetch procurement criterias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllCriteriaTypes };