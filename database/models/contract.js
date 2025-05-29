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
      
      Contract.hasMany(models.PaymentInstruction, {
        foreignKey: 'contract_id',
        as: 'paymentInstructions',
      });

      Contract.hasMany(models.ContractLog, {
        foreignKey: 'contract_id',
        as: 'logs',
      });

      Contract.hasMany(models.Notification, {
        foreignKey: 'contract_id',
        as: 'notifications',
      });

      Contract.hasMany(models.ContractChangeRequest, {
        foreignKey: 'contract_id',
        as: 'changeRequests',
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
      status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      timeline: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      original_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      contract_path: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      file_type: {
        type: DataTypes.STRING,
        allowNull: true,
      }
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

