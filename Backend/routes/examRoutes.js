const express = require('express');
const router = express.Router();
const {
    getExams,
    createExam,
    updateExam,
    deleteExam,
    getQuestions,
    addQuestion,
    deleteQuestion
} = require('../controllers/examController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getExams);
router.post('/', protect, createExam);
router.put('/:id', protect, updateExam);
router.delete('/:id', protect, deleteExam);

router.get('/questions/:examId', protect, getQuestions);
router.post('/questions', protect, addQuestion);
router.delete('/questions/:id', protect, deleteQuestion);

module.exports = router;
