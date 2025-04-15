'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('procurement_requests', 'bid_edit_deadline', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('procurement_requests', 'bid_edit_deadline');
  }
};
