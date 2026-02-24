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
    candidate_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    candidate_mobile: {
        type: DataTypes.STRING,
        allowNull: true
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
    },
    responses: {
        type: DataTypes.JSON,
        allowNull: true
    },
    submission_type: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Submitted by candidate'
    },
    tab_switch_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    fullscreen_exit_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    face_detection_violations: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    multi_face_violations: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    mic_violations: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: false
});

module.exports = Attempt;
