const { Attempt, ExamRecording } = require('../models');
const { uploadToS3, getS3Object, getSignedS3Url } = require('../utils/s3');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

const uploadChunk = async (req, res) => {
    try {
        const { attemptId, candidateEmail, candidateName, timestamp } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No video chunk provided' });
        }

        const s3Key = `recordings/${candidateEmail}/attempt-${attemptId}/${timestamp}.webm`;
        const s3Url = await uploadToS3(s3Key, file.buffer, file.mimetype);

        await ExamRecording.create({
            attempt_id: attemptId,
            candidate_email: candidateEmail,
            candidate_name: candidateName,
            s3_video_url: s3Url,
            s3_key: s3Key,
            timestamp: parseInt(timestamp),
            created_at: new Date()
        });

        res.json({ message: 'Chunk uploaded successfully', s3Url });
    } catch (error) {
        console.error('Error in uploadChunk:', error);
        res.status(500).json({ message: 'Error uploading video chunk' });
    }
};

const finalizeRecording = async (req, res) => {
    const { attemptId } = req.body;
    const tempDir = path.join(__dirname, '../temp', `attempt-${attemptId}`);

    try {
        console.log(`[Proctoring] Starting finalization for attempt: ${attemptId}`);

        // 1. Fetch chunks sorted by timestamp
        const chunks = await ExamRecording.findAll({
            where: { attempt_id: attemptId },
            order: [['timestamp', 'ASC']]
        });

        console.log(`[Proctoring] Found ${chunks.length} chunks for attempt ${attemptId}`);

        if (chunks.length === 0) {
            return res.status(404).json({ message: 'No recordings found for this attempt' });
        }

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const fileListPath = path.join(tempDir, 'files.txt');
        const fileListContent = [];

        // 2. Download chunks locally
        await Promise.all(chunks.map(async (chunk, index) => {
            const s3Key = chunk.s3_key || (chunk.s3_video_url ? chunk.s3_video_url.split('.com/')[1] : null);
            if (!s3Key) {
                console.warn(`[Proctoring] Chunk ${index} has no S3 key, skipping...`);
                return;
            }

            const localPath = path.resolve(tempDir, `chunk-${index}.webm`);
            console.log(`[Proctoring] Downloading chunk ${index} from S3: ${s3Key}`);

            try {
                const bodyStream = await getS3Object(s3Key);
                await pipeline(bodyStream, fs.createWriteStream(localPath));
                fileListContent.push(`file '${localPath.replace(/\\/g, '/')}'`); // Normalize paths for ffmpeg
            } catch (dlErr) {
                console.error(`[Proctoring] Failed to download chunk ${index}:`, dlErr.message);
                // We keep going if some chunks fail, but this might result in a skip in the video
            }
        }));

        // Sort file list content just in case Promise.all order differs
        // though we used index, it's safer to build it in order
        const orderedFileList = chunks.map((_, index) => `file '${path.join(tempDir, `chunk-${index}.webm`)}'`).join('\n');
        fs.writeFileSync(fileListPath, orderedFileList);

        // 3. Merge using FFMPEG
        const finalVideoPath = path.resolve(tempDir, 'final.webm');
        const candidateEmail = chunks[0].candidate_email;
        const finalS3Key = `recordings/${candidateEmail}/attempt-${attemptId}/final.webm`;

        console.log(`[Proctoring] Merging ${fileListContent.length} files into ${finalVideoPath}`);

        await new Promise((resolve, reject) => {
            const process = ffmpeg()
                .input(fileListPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions('-c copy')
                .on('start', (cmd) => console.log('[Proctoring] FFMPEG command:', cmd))
                .on('end', () => {
                    console.log('[Proctoring] FFMPEG merge completed.');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('[Proctoring] FFMPEG error:', err.message);
                    reject(err);
                })
                .save(finalVideoPath);
        });

        // 4. Upload merged video to S3
        const finalBuffer = fs.readFileSync(finalVideoPath);
        await uploadToS3(finalS3Key, finalBuffer, 'video/webm');

        // 5. Update Attempt table
        await Attempt.update(
            { final_video_key: finalS3Key },
            { where: { id: attemptId } }
        );

        // 6. Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });

        res.json({ message: 'Recording finalized successfully', finalS3Key });
    } catch (error) {
        console.error('Error in finalizeRecording:', error);
        // Ensure cleanup on error
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        res.status(500).json({ message: 'Error finalizing recording' });
    }
};

const getRecordingUrl = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Attempt.findByPk(attemptId);

        if (!attempt || !attempt.final_video_key) {
            return res.status(404).json({ message: 'No recording found for this attempt' });
        }

        const signedUrl = await getSignedS3Url(attempt.final_video_key);
        res.json({ signedUrl });
    } catch (error) {
        console.error('Error in getRecordingUrl:', error);
        res.status(500).json({ message: 'Error generating recording URL' });
    }
};

module.exports = {
    uploadChunk,
    finalizeRecording,
    getRecordingUrl
};
