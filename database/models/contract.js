'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {
    static associate(models) {
      Contract.belongsTo(models.ProcurementRequest, {
        foreignKey: 'procurement_request_id',
        as: 'procurementRequest',
      });

      Contract.belongsTo(models.ProcurementBid, {
        foreignKey: 'bid_id',
        as: 'bid',
      });

      Contract.hasMany(models.Dispute, {
        foreignKey: 'contract_id',
        as: 'disputes',
      });
    }
  }

  Contract.init(
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
      bid_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Contract',
      tableName: 'contracts',
      underscored: true,
      timestamps: true,
    }
  );

  return Contract;
};

