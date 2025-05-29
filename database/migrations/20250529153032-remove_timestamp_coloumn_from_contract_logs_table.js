'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('contract_logs', 'timestamp');
    await queryInterface.removeColumn('contract_logs', 'updated_at');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('contract_logs', 'timestamp', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    await queryInterface.addColumn('contract_logs', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  }
};

