const { Category } =  require('../../database/models/procurementcategory'); 

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name'], // vrati samo potrebne podatke
      order: [['name', 'ASC']],
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllCategories,
};
