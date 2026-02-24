const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExamRecording = sequelize.define('ExamRecording', {
    attempt_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Attempts',
            key: 'id'
        }
    },
    candidate_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    candidate_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    s3_video_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    timestamp: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false
});

module.exports = ExamRecording;
