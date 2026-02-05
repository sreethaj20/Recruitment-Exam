const Admin = require('./Admin');
const Exam = require('./Exam');
const Question = require('./Question');
const Invitation = require('./Invitation');
const Candidate = require('./Candidate');
const Attempt = require('./Attempt');

// Associations

// Exam - Question (One-to-Many)
Exam.hasMany(Question, { foreignKey: 'exam_id', onDelete: 'CASCADE' });
Question.belongsTo(Exam, { foreignKey: 'exam_id' });

// Exam - Invitation (One-to-Many)
Exam.hasMany(Invitation, { foreignKey: 'exam_id', onDelete: 'CASCADE' });
Invitation.belongsTo(Exam, { foreignKey: 'exam_id' });

// Exam - Attempt (One-to-Many)
Exam.hasMany(Attempt, { foreignKey: 'exam_id', onDelete: 'CASCADE' });
Attempt.belongsTo(Exam, { foreignKey: 'exam_id' });

// Candidate - Attempt (One-to-Many)
Candidate.hasMany(Attempt, { foreignKey: 'candidate_id', onDelete: 'CASCADE' });
Attempt.belongsTo(Candidate, { foreignKey: 'candidate_id' });

// Admin - Candidate (One-to-Many: Registered By)
Admin.hasMany(Candidate, { foreignKey: 'registered_by' });
Candidate.belongsTo(Admin, { foreignKey: 'registered_by' });

module.exports = {
    Admin,
    Exam,
    Question,
    Invitation,
    Candidate,
    Attempt
};
