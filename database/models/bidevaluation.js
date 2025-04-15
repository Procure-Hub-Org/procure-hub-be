'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BidEvaluation extends Model {
    static associate(models) {
        BidEvaluation.belongsTo(models.ProcurementBid, {
            foreignKey: 'procurement_bid_id',
            as: 'procurementBid',
        });
    
        BidEvaluation.belongsTo(models.EvaluationCriteria, {
            foreignKey: 'evaluation_criteria_id',
            as: 'evaluationCriteria',
        });
    }
  }

  BidEvaluation.init(
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
        evaluation_criteria_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        score: {
            type: DataTypes.FLOAT,
            allowNull: false,
        }
    },
    {
      sequelize,
      modelName: 'BidEvaluation',
      tableName: 'bid_evaluations',
      underscored: true,
      timestamps: true,
    }
  );

  return BidEvaluation;
};
