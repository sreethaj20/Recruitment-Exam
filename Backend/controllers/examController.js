const { Exam, Question } = require('../models');

// Exam Controllers
const getExams = async (req, res) => {
    try {
        const exams = await Exam.findAll();
        // Manually add counts as the current model setup might not have associations fully defined for a simple include
        const examsWithCounts = await Promise.all(exams.map(async (exam) => {
            const count = await Question.count({ where: { exam_id: exam.id } });
            return {
                ...exam.toJSON(),
                questions_count: count
            };
        }));
        res.json(examsWithCounts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exams' });
    }
};

const createExam = async (req, res) => {
    try {
        const exam = await Exam.create(req.body);
        res.status(201).json(exam);
    } catch (error) {
        res.status(500).json({ message: 'Error creating exam' });
    }
};

const deleteExam = async (req, res) => {
    try {
        await Exam.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Exam deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting exam' });
    }
};

const updateExam = async (req, res) => {
    try {
        const { id } = req.params;
        await Exam.update(req.body, { where: { id } });
        res.json({ message: 'Exam updated' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating exam' });
    }
};

// Question Controllers
const getQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll({ where: { exam_id: req.params.examId } });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching questions' });
    }
};

const addQuestion = async (req, res) => {
    try {
        const questionData = { ...req.body };
        if (questionData.type === 'text' && typeof questionData.keywords === 'string') {
            questionData.keywords = questionData.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k !== '');
        }
        if (questionData.type === 'fill_in_the_blank') {
            questionData.options = null;
            questionData.keywords = null;
        }
        const question = await Question.create(questionData);
        res.status(201).json(question);
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ message: 'Error adding question' });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        await Question.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Question deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting question' });
    }
};

module.exports = {
    getExams,
    createExam,
    deleteExam,
    updateExam,
    getQuestions,
    addQuestion,
    deleteQuestion
};
