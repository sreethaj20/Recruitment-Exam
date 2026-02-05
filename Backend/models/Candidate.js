const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Candidate = sequelize.define('Candidate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    mobile: {
        type: DataTypes.STRING,
        allowNull: false
    },
    qualification: {
        type: DataTypes.STRING
    },
    registered_by: {
        type: DataTypes.UUID
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending' // 'pending', 'shortlisted', 'rejected'
    },
    remarks: {
        type: DataTypes.TEXT
    }
}, {
    timestamps: false
});

module.exports = Candidate;
