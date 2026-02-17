const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Invitation = sequelize.define('Invitation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    exam_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending' // 'pending', 'used'
    },
    is_multi_use: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    test_type: {
        type: DataTypes.STRING,
        defaultValue: 'internal' // 'internal', 'external'
    },
    require_camera: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    require_microphone: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true
});

module.exports = Invitation;
