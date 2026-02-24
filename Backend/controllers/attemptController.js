const { Attempt, Exam, Invitation, Candidate } = require('../models');
const { Op } = require('sequelize');

const startAttempt = async (req, res) => {
    try {
        const { candidate_id, exam_id, token } = req.body;

        // Fetch candidate details
        const candidate = await Candidate.findByPk(candidate_id);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const candidateEmail = candidate.email.toLowerCase();
        const candidateMobile = candidate.mobile;

        // Check if candidate already has an attempt (any exam) by email or phone
        const existingAttempt = await Attempt.findOne({
            where: {
                [Op.or]: [
                    { candidate_email: candidateEmail },
                    { candidate_mobile: candidateMobile }
                ]
            }
        });

        if (existingAttempt) {
            return res.status(403).json({
                message: 'You have already attempted an assessment. Multiple attempts are not allowed.'
            });
        }

        // Check invitation expiration (8 hours)
        const invitation = await Invitation.findOne({ where: { token } });
        if (!invitation) {
            return res.status(404).json({ message: 'Invalid token' });
        }

        const hoursSinceCreation = (new Date() - new Date(invitation.createdAt)) / (1000 * 60 * 60);
        if (hoursSinceCreation > 8) {
            return res.status(410).json({ message: 'This invitation link has expired (8 hour limit exceeded)' });
        }

        const attempt = await Attempt.create({
            candidate_id,
            exam_id,
            candidate_email: candidateEmail,
            candidate_mobile: candidateMobile,
            status: 'ongoing'
        });

        // Mark invitation as used ONLY if it's not multi-use
        if (!invitation.is_multi_use) {
            await invitation.update({ status: 'used' });
        }

        res.status(201).json(attempt);
    } catch (error) {
        res.status(500).json({ message: 'Error starting attempt' });
    }
};

const submitAttempt = async (req, res) => {
    try {
        const { id } = req.params;
        const { score, total_questions, percentage, responses, submission_type } = req.body;

        const attempt = await Attempt.update({
            score,
            total_questions,
            percentage,
            responses,
            submission_type: submission_type || 'Submitted by candidate',
            status: 'completed',
            completed_at: new Date()
        }, {
            where: { id }
        });

        res.json({ message: 'Attempt submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting attempt' });
    }
};

const getAttempts = async (req, res) => {
    try {
        const attempts = await Attempt.findAll({
            where: { status: 'completed' }
        });
        res.json(attempts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attempts' });
    }
};

const getAttemptById = async (req, res) => {
    try {
        const { id } = req.params;
        const attempt = await Attempt.findByPk(id, {
            include: [
                { model: Exam, include: ['Questions'] },
                'Candidate'
            ]
        });

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        res.json(attempt);
    } catch (error) {
        console.error("Error fetching attempt details:", error);
        res.status(500).json({ message: 'Error fetching attempt details' });
    }
};

module.exports = {
    startAttempt,
    submitAttempt,
    getAttempts,
    getAttemptById
};
