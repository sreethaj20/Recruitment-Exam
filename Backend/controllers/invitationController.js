const { Invitation, Exam, Question, Candidate, InvitationCandidate } = require('../models');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const getInvitations = async (req, res) => {
    try {
        const invitations = await Invitation.findAll({
            include: [
                { model: Exam, attributes: ['title'] },
                { model: Candidate, attributes: ['id', 'name', 'email'], through: { attributes: [] } },
                { model: Candidate, as: 'Candidate', attributes: ['name', 'email'] } // Keep legacy support
            ]
        });
        res.json(invitations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invitations' });
    }
};

const createInvitation = async (req, res) => {
    try {
        const { exam_id, candidate_id, candidate_ids, is_multi_use, test_type, require_camera, require_microphone } = req.body;
        const token = Math.random().toString(36).substr(2, 12); // Simple token for now
        const invitation = await Invitation.create({
            exam_id,
            candidate_id: Array.isArray(candidate_ids) ? null : (candidate_id || null),
            token,
            is_multi_use: !!is_multi_use,
            test_type: test_type || 'internal',
            require_camera: require_camera !== undefined ? !!require_camera : (test_type !== 'internal'),
            require_microphone: require_microphone !== undefined ? !!require_microphone : (test_type !== 'internal')
        });

        // Handle many-to-many candidates
        const ids = Array.isArray(candidate_ids) ? candidate_ids : (candidate_id ? [candidate_id] : []);
        if (ids.length > 0) {
            const associations = ids.map(id => ({
                invitation_id: invitation.id,
                candidate_id: id
            }));
            await InvitationCandidate.bulkCreate(associations);
        }

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

        if (invitation.test_type === 'internal') {
            invitation.require_camera = false;
            invitation.require_microphone = false;
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
        exam.test_type = invitation.test_type;
        exam.require_camera = invitation.test_type === 'internal' ? false : invitation.require_camera;
        exam.require_microphone = invitation.test_type === 'internal' ? false : invitation.require_microphone;
        res.json(exam);
    } catch (error) {
        console.error('Error fetching assessment data:', error);
        res.status(500).json({ message: 'Error fetching assessment data' });
    }
};

const serveCPTBook = async (req, res) => {
    try {
        const filePath = path.join(__dirname, '../pdfs/CPT2026.pdf');
        const fs = require('fs');

        if (!fs.existsSync(filePath)) {
            console.error('CPT Book file not found:', filePath);
            return res.status(404).json({ message: 'Resource not found' });
        }

        const stats = fs.statSync(filePath);
        console.log(`[Resources] Serving CPT Book: ${stats.size} bytes`);

        const options = {
            root: path.join(__dirname, '../'),
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline; filename="CPT2026.pdf"',
                'Cache-Control': 'public, max-age=31536000',
                'X-Content-Type-Options': 'nosniff',
                'Access-Control-Allow-Origin': '*',
                'Content-Security-Policy': "frame-ancestors 'self' https://assessmentcenter.mercuresolution.com http://localhost:5173 http://localhost:5000 http://127.0.0.1:5173",
                'X-Frame-Options': 'ALLOWALL'
            }
        };

        res.sendFile('pdfs/CPT2026.pdf', options, (err) => {
            if (err) {
                if (!res.headersSent) {
                    console.error('Error sending file:', err);
                    res.status(err.status || 500).end();
                } else {
                    console.error('File transfer interrupted:', err.message);
                }
            }
        });
    } catch (error) {
        console.error('Error in serveCPTBook:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal server error accessing resource' });
        }
    }
};

module.exports = {
    getInvitations,
    createInvitation,
    createBulkInvitations,
    toggleMultiUse,
    validateToken,
    deleteInvitation,
    getAssessmentData,
    serveCPTBook
};
