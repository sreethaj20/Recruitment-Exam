const { Candidate, Invitation, InvitationCandidate } = require('../models');

const registerCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.create({
            ...req.body,
            email: req.body.email?.toLowerCase(),
            registered_by: req.user.id
        });
        res.status(201).json(candidate);
    } catch (error) {
        res.status(500).json({ message: 'Error registering candidate' });
    }
};

const verifyCandidate = async (req, res) => {
    try {
        const { email, mobile, token } = req.body;

        // Basic candidate lookup
        const candidate = await Candidate.findOne({
            where: {
                email: email.toLowerCase(),
                mobile: mobile
            }
        });

        if (!candidate) {
            return res.status(404).json({ message: 'You are not registered, contact HR' });
        }

        // Check for link authorization if token is provided
        if (token) {
            const invitation = await Invitation.findOne({
                where: { token },
                include: [
                    { model: Candidate, attributes: ['id', 'email', 'mobile'], through: { attributes: [] } },
                    { model: Candidate, as: 'Candidate', attributes: ['id', 'email', 'mobile'] } // Singular for legacy support
                ]
            });

            if (invitation) {
                // Determine all authorized candidate IDs for this link
                const authorizedIds = new Set();
                if (invitation.candidate_id) authorizedIds.add(invitation.candidate_id);
                if (invitation.Candidates) {
                    invitation.Candidates.forEach(c => authorizedIds.add(c.id));
                }

                // If the link is restricted to specific candidates, verify this candidate is one of them
                if (authorizedIds.size > 0 && !authorizedIds.has(candidate.id)) {
                    return res.status(403).json({ message: 'You are not authorized to use this specific assessment link. Please check with HR.' });
                }
            }
        }

        res.json(candidate);
    } catch (error) {
        res.status(500).json({ message: 'Error verifying candidate' });
    }
};

const updateCandidateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const candidate = await Candidate.findByPk(id);
        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }
        if (status) candidate.status = status;
        if (remarks !== undefined) candidate.remarks = remarks;
        await candidate.save();
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ message: 'Error updating candidate' });
    }
};

const getCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.findAll();
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching candidates' });
    }
};

const deleteCandidate = async (req, res) => {
    try {
        const { id } = req.params;
        await Candidate.destroy({ where: { id } });
        res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting candidate' });
    }
};

module.exports = {
    registerCandidate,
    verifyCandidate,
    getCandidates,
    deleteCandidate,
    updateCandidateStatus
};
