'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User belongs to BuyerType
      User.belongsTo(models.BuyerType, {
        foreignKey: 'buyer_type_id',
        as: 'buyerType',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      // User can be approved by another user (admin)
      User.belongsTo(models.User, {
        foreignKey: 'admin_id',
        as: 'statusSetter',
        onDelete: 'SET NULL',
      });

      // User can have many favorites
      User.hasMany(models.Favorite, {
        foreignKey: 'user_id',
        as: 'favorites',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      // User can have many procurement requests
      User.hasMany(models.ProcurementRequest, {
        foreignKey: 'buyer_id',
        as: 'procurementRequests',
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['buyer', 'seller', 'admin']]
      }
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    profile_picture: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    company_address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    company_logo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'active', 'suspended']]
      }
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
    },
    suspended_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    buyer_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'buyer_types',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};