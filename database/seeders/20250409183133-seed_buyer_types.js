'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('buyer_types', [
      {
        name: 'Government',
        description: 'Public sector organizations and institutions',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Private Company',
        description: 'For-profit private businesses and enterprises',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Non-Profit',
        description: 'NGOs and other non-profit organizations',
        created_at: new Date(),
        updated_at: new Date(),
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('buyer_types', null, {});
  }
};
