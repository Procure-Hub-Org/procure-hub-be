'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn('contracts', 'status', {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      }),
      queryInterface.addColumn('contracts', 'price', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }),
      queryInterface.addColumn('contracts', 'timeline', {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn('contracts', 'original_name', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn('contracts', 'contract_path', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn('contracts', 'file_type', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn('contracts', 'status'),
      queryInterface.removeColumn('contracts', 'price'),
      queryInterface.removeColumn('contracts', 'timeline'),
      queryInterface.removeColumn('contracts', 'original_name'),
      queryInterface.removeColumn('contracts', 'contract_path'),
      queryInterface.removeColumn('contracts', 'file_type'),
    ]);
  }
};

