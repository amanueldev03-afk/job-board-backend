const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RefreshToken = sequelize.define('RefreshToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
    },
    revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    deviceInfo: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'device_info'
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ip_address'
    }
}, {
    timestamps: true,
    tableName: 'refresh_tokens',
    indexes: [
        {
            unique: true,
            fields: ['token']
        },
        {
            fields: ['user_id']
        }
    ]
});

module.exports = RefreshToken;