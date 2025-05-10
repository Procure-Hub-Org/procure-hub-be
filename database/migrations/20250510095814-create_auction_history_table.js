'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('auction_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      auction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'auctions', 
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      bid_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'procurement_bids', 
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      price_submitted_at: {
        type: Sequelize.DATE, 
        allowNull: false
      },
      previous_position: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      new_position: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('auction_history');
  }
};
