const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Question = sequelize.define('Question', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    exam_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'mcq' // 'mcq', 'text', 'fill_in_the_blank'
    },
    options: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    correct_answer: {
        type: DataTypes.STRING,
        allowNull: true
    },
    keywords: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    timestamps: false
});

module.exports = Question;
