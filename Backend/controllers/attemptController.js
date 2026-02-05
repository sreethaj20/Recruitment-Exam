const { Attempt, Exam, Invitation } = require('../models');

const startAttempt = async (req, res) => {
    try {
        const { candidate_id, exam_id, token } = req.body;

        // Check if candidate already has a completed attempt for this exam
        const existingAttempt = await Attempt.findOne({
            where: {
                candidate_id,
                exam_id,
                status: 'completed'
            }
        });

        if (existingAttempt) {
            return res.status(403).json({ message: 'You have already completed this assessment. Re-taking is not allowed.' });
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
        const { score, total_questions, percentage } = req.body;

        const attempt = await Attempt.update({
            score,
            total_questions,
            percentage,
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

module.exports = {
    startAttempt,
    submitAttempt,
    getAttempts
};
