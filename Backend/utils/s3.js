const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1'
    // Credentials are not needed if running on EC2 with an IAM Role
});

const uploadToS3 = async (key, buffer, contentType) => {
    const params = {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
    };

    try {
        await s3Client.send(new PutObjectCommand(params));
        return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
};

const getSignedS3Url = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key
        });
        // URL expires in 1 hour
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
};

const getS3Object = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key
        });
        const response = await s3Client.send(command);
        return response.Body;
    } catch (error) {
        console.error('Error fetching object from S3:', error);
        throw error;
    }
};

module.exports = {
    uploadToS3,
    getSignedS3Url,
    getS3Object
};
