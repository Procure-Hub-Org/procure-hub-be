'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminAlert extends Model {
    static associate(models) {
        // Define associations here
        AdminAlert.belongsTo(models.ProcurementRequest, {
            foreignKey: 'procurement_request_id',
            as: 'procurementRequest',
        });
    }
  }

  AdminAlert.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      procurement_request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      alert: {
        type: DataTypes.STRING,
        allowNull: false,
      }
    },
    {
      sequelize,
      modelName: 'AdminAlert',
      tableName: 'admin_alerts',
      underscored: true,
      timestamps: true,
    }
  );

  return AdminAlert;
};
