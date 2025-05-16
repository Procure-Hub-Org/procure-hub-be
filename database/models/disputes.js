'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Dispute extends Model {
    static associate(models) {
      Dispute.belongsTo(models.Contract, {
        foreignKey: 'contract_id',
        as: 'contract',
      });

      Dispute.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      });
    }
  }

  Dispute.init(
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
      complainment_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Dispute',
      tableName: 'disputes',
      underscored: true,
      timestamps: true,
    }
  );

  return Dispute;
};
