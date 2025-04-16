'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BidDocument extends Model {
    static associate(models) {
      BidDocument.belongsTo(models.ProcurementBid, {
        foreignKey: 'procurement_bid_id',
        as: 'procurementBid',
      });
    }
  }

  BidDocument.init(
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
      original_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      file_type: {
        type: DataTypes.STRING,
        allowNull: false,
      }
    },
    {
      sequelize,
      modelName: 'BidDocument',
      tableName: 'bid_documents',
      underscored: true,
      timestamps: true,
    }
  );

  return BidDocument;
};
