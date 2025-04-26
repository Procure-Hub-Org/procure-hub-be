'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('procurement_bids', 'auction_price', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('procurement_bids', 'price_submitted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('procurement_bids', 'auction_placement', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('procurement_bids', 'auction_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'auctions', 
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('procurement_bids', 'auction_price');
    await queryInterface.removeColumn('procurement_bids', 'price_submitted_at');
    await queryInterface.removeColumn('procurement_bids', 'auction_placement');
    await queryInterface.removeColumn('procurement_bids', 'auction_id');
  }
};

