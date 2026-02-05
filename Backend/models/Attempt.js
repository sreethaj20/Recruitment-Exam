const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Attempt = sequelize.define('Attempt', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    candidate_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    exam_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    score: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    total_questions: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    percentage: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'ongoing' // 'ongoing', 'completed'
    },
    completed_at: {
        type: DataTypes.DATE
    }
}, {
    timestamps: false
});

module.exports = Attempt;
