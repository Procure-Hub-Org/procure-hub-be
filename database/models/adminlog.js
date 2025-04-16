'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminLog extends Model {
    static associate(models) {
        // Define associations here
        AdminLog.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
    
        AdminLog.belongsTo(models.ProcurementBid, {
            foreignKey: 'procurement_bid_id',
            as: 'procurementBid',
        });
    }
  }

  AdminLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      procurement_bid_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      }
    },
    {
      sequelize,
      modelName: 'AdminLog',
      tableName: 'admin_logs',
      underscored: true,
      timestamps: true,
    }
  );

  return AdminLog;
};
