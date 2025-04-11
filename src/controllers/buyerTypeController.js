const { BuyerType } = require('../../database/models');

const getAllBuyerTypes = async (req, res) => {
  try {
    const buyerTypes = await BuyerType.findAll();
    res.json(buyerTypes);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching buyer types.' });
  }
};

const getBuyerTypeById = async (id) => {
  const buyerType = await BuyerType.findByPk(id);
  return buyerType || null;
};

const createBuyerType = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newBuyerType = await BuyerType.create({ name, description: description ? description : null });
    res.status(201).json(newBuyerType);
  } catch (error) {
    res.status(400).json({ error: 'Error creating buyer type.' });
  }
};

const findBuyerTypeByName = async (name) => {
  try {
    const buyerType = await BuyerType.findOne({ where: { name } });
    return buyerType;
  } catch (error) {
    throw new Error('Error fetching buyer type by name.');
  }
};

module.exports = {
    getAllBuyerTypes,
    getBuyerTypeById,
    createBuyerType,
    findBuyerTypeByName
    };