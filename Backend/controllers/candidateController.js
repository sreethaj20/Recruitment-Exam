const { Candidate } = require('../models');

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
        const { email, mobile } = req.body;
        const candidate = await Candidate.findOne({
            where: {
                email: email.toLowerCase(),
                mobile: mobile
            }
        });

        if (!candidate) {
            return res.status(404).json({ message: 'You are not registered, contact HR' });
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
