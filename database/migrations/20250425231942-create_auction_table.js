'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('auctions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      procurement_request_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'procurement_requests', 
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      starting_time: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER, 
        allowNull: false
      },
      min_increment: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      last_call_timer: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ending_time: {
        type: Sequelize.DATE,
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
    await queryInterface.dropTable('auctions');
  }
};
