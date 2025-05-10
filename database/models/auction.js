'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Auction extends Model {
    static associate(models) {
      Auction.belongsTo(models.ProcurementRequest, {
        foreignKey: 'procurement_request_id',
        as: 'procurementRequest',
      });

      Auction.hasMany(models.ProcurementBid, {
        foreignKey: 'auction_id',
        as: 'bids',
      });

      Auction.hasMany(models.AuctionHistory, {
        foreignKey: 'auction_id',
        as: 'auctionHistory',
      });
    }
  }

  Auction.init(
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
      starting_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      min_increment: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      last_call_timer: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ending_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Auction',
      tableName: 'auctions',
      underscored: true,
      timestamps: true,
    }
  );

  return Auction;
};
