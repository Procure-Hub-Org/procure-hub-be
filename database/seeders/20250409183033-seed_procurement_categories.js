'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('categories', [
      {
        name: 'Office Supplies',
        description: 'Stationery, printers, paper, and general office materials',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'IT Equipment',
        description: 'Computers, networking devices, and related accessories',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Construction Services',
        description: 'Building, maintenance, and repair services',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
  }
};
