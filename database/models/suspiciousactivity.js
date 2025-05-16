'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SuspiciousActivity extends Model {
    static associate(models) {
      SuspiciousActivity.belongsTo(models.User, {
        foreignKey: 'seller_id',
        as: 'seller',
      });

      SuspiciousActivity.belongsTo(models.ProcurementRequest, {
        foreignKey: 'procurement_request_id',
        as: 'procurementRequest',
      });
    }
  }

  SuspiciousActivity.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      seller_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      procurement_request_id: {
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
      modelName: 'SuspiciousActivity',
      tableName: 'suspicious_activity',
      underscored: true,
      timestamps: true,
    }
  );

  return SuspiciousActivity;
};
