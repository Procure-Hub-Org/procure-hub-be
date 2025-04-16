'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CriteriaType extends Model {
    static associate(models) {
        CriteriaType.hasMany(models.EvaluationCriteria, {
            foreignKey: 'criteria_type_id',
            as: 'evaluationCriteria',
        });
    }
  }

  CriteriaType.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      }
    },
    {
      sequelize,
      modelName: 'CriteriaType',
      tableName: 'criteria_types',
      underscored: true,
      timestamps: true,
    }
  );

  return CriteriaType;
};
