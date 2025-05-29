'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContractChangeRequest extends Model {
    static associate(models) {
      ContractChangeRequest.belongsTo(models.Contract, {
        foreignKey: 'contract_id',
        as: 'contract',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      ContractChangeRequest.belongsTo(models.User, {
        foreignKey: 'seller_id',
        as: 'seller',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  ContractChangeRequest.init(
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
      seller_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      modelName: 'ContractChangeRequest',
      tableName: 'contract_change_requests',
      underscored: true,
      timestamps: true, 
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return ContractChangeRequest;
};
