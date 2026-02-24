const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadChunk, finalizeRecording, getRecordingUrl } = require('../controllers/proctoringController');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/upload-chunk', upload.single('video'), uploadChunk);
router.post('/finalize', finalizeRecording);
router.get('/download/:attemptId', protect, getRecordingUrl);

module.exports = router;
