const Admin = require('./Admin');
const Exam = require('./Exam');
const Question = require('./Question');
const Invitation = require('./Invitation');
const Candidate = require('./Candidate');
const Attempt = require('./Attempt');
const ExamRecording = require('./ExamRecording');
const InvitationCandidate = require('./InvitationCandidate');

// Associations

// Exam - Question (One-to-Many)
Exam.hasMany(Question, { foreignKey: 'exam_id', onDelete: 'CASCADE' });
Question.belongsTo(Exam, { foreignKey: 'exam_id' });

// Exam - Invitation (One-to-Many)
Exam.hasMany(Invitation, { foreignKey: 'exam_id', onDelete: 'CASCADE' });
Invitation.belongsTo(Exam, { foreignKey: 'exam_id' });

// Invitation - Candidate (Many-to-Many)
Invitation.belongsToMany(Candidate, { through: InvitationCandidate, foreignKey: 'invitation_id' });
Candidate.belongsToMany(Invitation, { through: InvitationCandidate, foreignKey: 'candidate_id' });

// Invitation - Candidate (One-to-One / Many-to-One - Legacy)
// Keep the singular candidate_id legacy if needed, or remove it. 
// I'll keep it for now but prioritize the many-to-many in implementation.
Candidate.hasMany(Invitation, { foreignKey: 'candidate_id' });
Invitation.belongsTo(Candidate, { foreignKey: 'candidate_id' });

// Exam - Attempt (One-to-Many)
Exam.hasMany(Attempt, { foreignKey: 'exam_id', onDelete: 'CASCADE' });
Attempt.belongsTo(Exam, { foreignKey: 'exam_id' });

// Candidate - Attempt (One-to-Many)
Candidate.hasMany(Attempt, { foreignKey: 'candidate_id', onDelete: 'CASCADE' });
Attempt.belongsTo(Candidate, { foreignKey: 'candidate_id' });

// Admin - Candidate (One-to-Many: Registered By)
Admin.hasMany(Candidate, { foreignKey: 'registered_by' });
Candidate.belongsTo(Admin, { foreignKey: 'registered_by' });

// Attempt - ExamRecording (One-to-Many)
Attempt.hasMany(ExamRecording, { foreignKey: 'attempt_id', onDelete: 'CASCADE' });
ExamRecording.belongsTo(Attempt, { foreignKey: 'attempt_id' });

module.exports = {
    Admin,
    Exam,
    Question,
    Invitation,
    Candidate,
    Attempt,
    ExamRecording,
    InvitationCandidate
};
