const { Invitation, Exam, Question } = require('../models');
const { v4: uuidv4 } = require('uuid');

const getInvitations = async (req, res) => {
    try {
        const invitations = await Invitation.findAll({
            include: [{ model: Exam, attributes: ['title'] }]
        });
        res.json(invitations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invitations' });
    }
};

const createInvitation = async (req, res) => {
    try {
        const { exam_id, is_multi_use } = req.body;
        const token = Math.random().toString(36).substr(2, 12); // Simple token for now
        const invitation = await Invitation.create({
            exam_id,
            token,
            is_multi_use: !!is_multi_use
        });
        res.status(201).json(invitation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating invitation' });
    }
};

const validateToken = async (req, res) => {
    try {
        const { token } = req.params;
        const invitation = await Invitation.findOne({
            where: { token },
            include: [{ model: Exam }]
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invalid token' });
        }

        // 8 Hours expiration check
        const hoursSinceCreation = (new Date() - new Date(invitation.createdAt)) / (1000 * 60 * 60);
        if (hoursSinceCreation > 8) {
            return res.status(410).json({ message: 'This invitation link has expired (8 hour limit exceeded)' });
        }

        res.json(invitation);
    } catch (error) {
        res.status(500).json({ message: 'Error validating token' });
    }
};

const createBulkInvitations = async (req, res) => {
    try {
        const { exam_id, count } = req.body;
        const invitations = [];
        for (let i = 0; i < count; i++) {
            const token = Math.random().toString(36).substr(2, 12);
            invitations.push({ exam_id, token });
        }
        const created = await Invitation.bulkCreate(invitations);
        res.status(201).json(created);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating bulk invitations' });
    }
};

const toggleMultiUse = async (req, res) => {
    try {
        const { id } = req.params;
        const invitation = await Invitation.findByPk(id);
        if (!invitation) return res.status(404).json({ message: 'Invitation not found' });

        invitation.is_multi_use = !invitation.is_multi_use;
        await invitation.save();
        res.json(invitation);
    } catch (error) {
        res.status(500).json({ message: 'Error toggling multi-use' });
    }
};

const deleteInvitation = async (req, res) => {
    try {
        await Invitation.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Invitation deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting invitation' });
    }
};

const getAssessmentData = async (req, res) => {
    try {
        const { token } = req.params;
        const invitation = await Invitation.findOne({
            where: { token },
            include: [{
                model: Exam,
                include: [{ model: Question }]
            }]
        });

        if (!invitation) {
            return res.status(404).json({ message: 'Invalid token' });
        }

        // 8 Hours expiration check
        const hoursSinceCreation = (new Date() - new Date(invitation.createdAt)) / (1000 * 60 * 60);
        if (hoursSinceCreation > 8) {
            return res.status(410).json({ message: 'This assessment link has expired (8 hour limit exceeded)' });
        }

        const exam = invitation.Exam.toJSON();
        let questions = [...exam.Questions];

        console.log(`Assessment start for exam: ${exam.title}`);
        console.log(`Total questions in pool: ${questions.length}`);
        console.log(`Configured pool size: ${exam.question_pool_size}`);

        // Shuffle questions
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        // Slice if pool size is set
        if (exam.question_pool_size && exam.question_pool_size > 0) {
            console.log(`Slicing questions to size: ${exam.question_pool_size}`);
            questions = questions.slice(0, exam.question_pool_size);
        }

        exam.Questions = questions;
        res.json(exam);
    } catch (error) {
        console.error('Error fetching assessment data:', error);
        res.status(500).json({ message: 'Error fetching assessment data' });
    }
};

module.exports = {
    getInvitations,
    createInvitation,
    createBulkInvitations,
    toggleMultiUse,
    validateToken,
    deleteInvitation,
    getAssessmentData
};
