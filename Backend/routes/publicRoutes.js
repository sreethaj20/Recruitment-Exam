const express = require('express');
const router = express.Router();
const {
    getInvitations,
    createInvitation,
    validateToken,
    deleteInvitation,
    getAssessmentData
} = require('../controllers/invitationController');
const {
    registerCandidate,
    verifyCandidate,
    getCandidates,
    deleteCandidate,
    updateCandidateStatus
} = require('../controllers/candidateController');
const {
    startAttempt,
    submitAttempt,
    getAttempts,
    getAttemptById
} = require('../controllers/attemptController');
const { protect } = require('../middleware/authMiddleware');

// Invitation Routes
router.get('/invites', protect, getInvitations);
router.post('/invites', protect, createInvitation);
router.get('/invites/validate/:token', validateToken);
router.get('/invites/:token/assessment-data', getAssessmentData);
router.delete('/invites/:id', protect, deleteInvitation);

// Candidate Routes
router.get('/candidates', protect, getCandidates);
router.post('/candidates/register', protect, registerCandidate);
router.post('/candidates/verify', verifyCandidate);
router.delete('/candidates/:id', protect, deleteCandidate);
router.patch('/candidates/:id/status', protect, updateCandidateStatus);

// Attempt Routes
router.get('/attempts', protect, getAttempts);
router.post('/attempts/start', startAttempt);
router.put('/attempts/submit/:id', submitAttempt);
router.get('/attempts/:id', protect, getAttemptById);

module.exports = router;
