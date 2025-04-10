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
        as: 'procurementCategory',
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });

      // A procurement request can have many favorites
      ProcurementRequest.hasMany(models.Favorite, {
        foreignKey: 'procurement_request_id',
        as: 'favorites',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });

      // A procurement request can have many items
      ProcurementRequest.hasMany(models.ProcurementItem, {
        foreignKey: 'procurement_request_id',
        as: 'items',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });

      // A procurement request can have many requirements
      ProcurementRequest.hasMany(models.Requirement, {
        foreignKey: 'procurement_request_id',
        as: 'requirements',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
    documentation: {
      type: DataTypes.TEXT,
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