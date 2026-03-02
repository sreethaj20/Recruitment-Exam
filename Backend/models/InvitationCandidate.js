const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InvitationCandidate = sequelize.define('InvitationCandidate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    invitation_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    candidate_id: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = InvitationCandidate;
