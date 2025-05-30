'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentInstruction extends Model {
    static associate(models) {
      PaymentInstruction.belongsTo(models.Contract, {
        foreignKey: 'contract_id',
        as: 'contract',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }

  PaymentInstruction.init(
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
      payment_policy: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'PaymentInstruction',
      tableName: 'payment_instructions',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );

  return PaymentInstruction;
};
