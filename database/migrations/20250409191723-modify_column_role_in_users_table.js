'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['buyer', 'seller', 'admin', 'super_admin']],
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['buyer', 'seller', 'admin']],
      },
    });
  }
};
