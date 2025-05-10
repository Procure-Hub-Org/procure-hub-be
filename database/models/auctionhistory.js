'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuctionHistory extends Model {
    static associate(models) {
        // Define associations here
        AuctionHistory.belongsTo(models.Auction, {
            foreignKey: 'auction_id',
            as: 'auction',
        });
        
        AuctionHistory.belongsTo(models.ProcurementBid, {
            foreignKey: 'bid_id',
            as: 'bid',
        });
    }
  }

  AuctionHistory.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        auction_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        bid_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        price_submitted_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        previous_position: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        new_position: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'AuctionHistory',
        tableName: 'auction_history',
        underscored: true,
        timestamps: true,
    }
  );

  return AuctionHistory;
};
