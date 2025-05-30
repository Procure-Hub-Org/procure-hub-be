'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('criteria_types', [
      {
        name: 'Price',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Quality',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Delivery Time',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Warranty & Support',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Experience',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('criteria_types', null, {});
  }
};
