'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProcurementRequest extends Model {
    static associate(models) {
      // A procurement request belongs to a user (buyer)
      ProcurementRequest.belongsTo(models.User, {
        foreignKey: 'buyer_id',
        as: 'buyer',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });

      // A procurement request belongs to a procurement category
      ProcurementRequest.belongsTo(models.ProcurementCategory, {
        foreignKey: 'category_id',
        as: 'category',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });

    }
  }

  ProcurementRequest.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    buyer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false
    },
    budget_min: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    budget_max: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'active', 'closed', 'awarded']]
      }
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
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
    modelName: 'ProcurementRequest',
    tableName: 'procurement_requests',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return ProcurementRequest;
};