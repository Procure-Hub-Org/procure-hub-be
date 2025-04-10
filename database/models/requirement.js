'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Requirement extends Model {
    static associate(models) {
      Requirement.belongsTo(models.ProcurementRequest, {
        foreignKey: 'procurement_request_id',
        as: 'procurementRequest',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }
  }

  Requirement.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    procurement_request_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['technical', 'legal', 'other']],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
  }, {
    sequelize,
    modelName: 'Requirement',
    tableName: 'requirements',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return Requirement;
};