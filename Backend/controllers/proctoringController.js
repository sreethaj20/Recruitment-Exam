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

    // Check if chunks exist before starting background process
    const chunksCount = await ExamRecording.count({ where: { attempt_id: attemptId } });
    if (chunksCount === 0) {
        return res.status(404).json({ message: 'No recordings found for this attempt' });
    }

    // Return response immediately to prevent frontend timeout/cancellation
    res.status(202).json({ message: 'Finalization started in background' });

    // Execute heavy logic in background
    (async () => {
        try {
            console.log(`[Proctoring] Starting background finalization for attempt: ${attemptId}`);

            // 1. Fetch chunks sorted by timestamp
            const chunks = await ExamRecording.findAll({
                where: { attempt_id: attemptId },
                order: [['timestamp', 'ASC']]
            });

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
            writeStream.setMaxListeners(0);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const s3Key = chunk.s3_key || (chunk.s3_video_url ? chunk.s3_video_url.split('.com/')[1] : null);
                if (!s3Key) continue;

                // Use simple backoff retry for chunk downloads
                let chunkDownloaded = false;
                for (let retry = 0; retry < 3; retry++) {
                    try {
                        const bodyStream = await getS3Object(s3Key);
                        await pipeline(bodyStream, writeStream, { end: false });
                        chunkDownloaded = true;
                        break;
                    } catch (err) {
                        console.error(`[Proctoring] Chunk download failed (retry ${retry + 1}):`, s3Key, err.message);
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
                if (!chunkDownloaded) {
                    console.warn(`[Proctoring] Skipping unretrievable chunk: ${s3Key}`);
                }
            }
            writeStream.end();

            await new Promise((resolve) => writeStream.on('finish', resolve));
            console.log(`[Proctoring] Binary concatenation complete: ${rawMergedPath}`);

            // 3. Process with FFMPEG (Optional)
            console.log(`[Proctoring] Checking for FFMPEG...`);
            let finalPathToUpload = rawMergedPath;

            try {
                const hasFfmpeg = await new Promise((resolve) => {
                    ffmpeg.getAvailableCodecs((err) => resolve(!err));
                });

                if (hasFfmpeg) {
                    console.log(`[Proctoring] Processing with FFMPEG (fixing headers)...`);
                    await new Promise((resolve) => {
                        ffmpeg()
                            .input(rawMergedPath)
                            .videoCodec('libvpx')
                            .audioCodec('libvorbis')
                            .outputOptions(['-fflags +genpts', '-crf 32', '-b:v 800k'])
                            .on('end', () => {
                                finalPathToUpload = finalVideoPath;
                                resolve();
                            })
                            .on('error', (err) => {
                                console.error('[Proctoring] FFMPEG error:', err.message);
                                resolve();
                            })
                            .save(finalVideoPath);
                    });
                }
            } catch (fError) {
                console.warn('[Proctoring] FFMPEG logic failed, proceeding with raw merge.');
            }

            // 4. Upload merged video to S3 (Using streaming for memory efficiency)
            console.log(`[Proctoring] Uploading merged video to S3: ${finalS3Key}`);
            const finalStream = fs.createReadStream(finalPathToUpload);
            await uploadToS3(finalS3Key, finalStream, 'video/webm');

            // 5. Update Attempt table
            await Attempt.update(
                { final_video_key: finalS3Key },
                { where: { id: attemptId } }
            );

            // 6. Cleanup
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log(`[Proctoring] Finalization complete for attempt: ${attemptId}`);
        } catch (error) {
            console.error('[Proctoring] Error in background finalization:', error);
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }
    })();
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
