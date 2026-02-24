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

        const rawMergedPath = path.resolve(tempDir, 'raw_merged.webm');
        const finalVideoPath = path.resolve(tempDir, 'final.webm');
        const candidateEmail = chunks[0].candidate_email;
        const finalS3Key = `recordings/${candidateEmail}/attempt-${attemptId}/final.webm`;

        // 2. Download and Binary Concatenate
        console.log(`[Proctoring] Downloading and concatenating ${chunks.length} chunks...`);
        const writeStream = fs.createWriteStream(rawMergedPath);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const s3Key = chunk.s3_key || (chunk.s3_video_url ? chunk.s3_video_url.split('.com/')[1] : null);
            if (!s3Key) continue;

            console.log(`[Proctoring] Appending chunk ${i}: ${s3Key}`);
            const bodyStream = await getS3Object(s3Key);
            await pipeline(bodyStream, writeStream, { end: false });
        }
        writeStream.end();

        // Wait for writeStream to finish
        await new Promise((resolve) => writeStream.on('finish', resolve));
        console.log(`[Proctoring] Binary concatenation complete: ${rawMergedPath}`);

        // 3. Process with FFMPEG to fix headers and duration
        console.log(`[Proctoring] Processing with FFMPEG (Re-encoding to fix metadata)...`);

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(rawMergedPath)
                // Re-encoding is necessary for WebM segments to fix timestamps and duration
                .videoCodec('libvpx')
                .audioCodec('libvorbis')
                .outputOptions([
                    '-fflags +genpts',
                    '-crf 32', // Slightly lower quality for faster re-encoding
                    '-b:v 800k'   // Target bitrate
                ])
                .on('start', (cmd) => console.log('[Proctoring] FFMPEG command:', cmd))
                .on('progress', (progress) => {
                    if (progress.percent) console.log(`[Proctoring] Merging progress: ${Math.round(progress.percent)}%`);
                })
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
        console.log(`[Proctoring] Uploading final merged video to S3: ${finalS3Key}`);
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
