'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EvaluationCriteria extends Model {
    static associate(models) {
        // Define associations here
        EvaluationCriteria.belongsTo(models.ProcurementRequest, {
            foreignKey: 'procurement_request_id',
            as: 'procurementRequest',
        });
    
        EvaluationCriteria.belongsTo(models.CriteriaType, {
            foreignKey: 'criteria_type_id',
            as: 'criteriaType',
        });
    
        EvaluationCriteria.hasOne(models.BidEvaluation, {
            foreignKey: 'evaluation_criteria_id',
            as: 'bidEvaluations',
        });
    }
  }

  EvaluationCriteria.init(
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
        criteria_type_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        is_must_have: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        }
    },
    {
      sequelize,
      modelName: 'EvaluationCriteria',
      tableName: 'evaluation_criteria',
      underscored: true,
      timestamps: true,
    }
  );

  return EvaluationCriteria;
};
