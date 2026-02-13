const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Exam = sequelize.define('Exam', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    department_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    candidate_type_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 60
    },
    question_pool_size: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: false
});

module.exports = Exam;
