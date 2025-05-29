'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {

      Notification.belongsTo(models.Contract, {
        foreignKey: 'contract_id',
        as: 'contract',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      Notification.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  Notification.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      contract_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Notification;
};
