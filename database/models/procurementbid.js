'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProcurementBid extends Model {
    static associate(models) {
      ProcurementBid.belongsTo(models.User, {
        foreignKey: 'seller_id',
        as: 'seller',
      });

      ProcurementBid.belongsTo(models.ProcurementRequest, {
        foreignKey: 'procurement_request_id',
        as: 'procurementRequest',
      });

      ProcurementBid.hasMany(models.BidDocument, {
        foreignKey: 'procurement_bid_id',
        as: 'documents',
      });

      ProcurementBid.hasMany(models.BidEvaluation, {
        foreignKey: 'procurement_bid_id',
        as: 'evaluations',
      });

      ProcurementBid.hasMany(models.AdminLog, {
        foreignKey: 'procurement_bid_id',
        as: 'adminLogs',
      });

      ProcurementBid.belongsTo(models.Auction, {
        foreignKey: 'auction_id',
        as: 'auction',
      });
      
      ProcurementBid.hasMany(models.AuctionHistory, {
        foreignKey: 'bid_id',
        as: 'auctionHistory',
      });
      
    }
  }

  ProcurementBid.init(
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
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      timeline: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      proposal_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      auction_price: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      price_submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      auction_placement: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      auction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      
    },
    {
      sequelize,
      modelName: 'ProcurementBid',
      tableName: 'procurement_bids',
      underscored: true,
      timestamps: true,
    }
  );

  return ProcurementBid;
};
