'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContractLog extends Model {
    static associate(models) {
      ContractLog.belongsTo(models.Contract, {
        foreignKey: 'contract_id',
        as: 'contract',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      ContractLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }

  ContractLog.init(
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
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      modelName: 'ContractLog',
      tableName: 'contract_logs',
      underscored: true,
      timestamps: false,
    }
  );

  return ContractLog;
};
