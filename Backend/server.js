const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');

// Import Models for Sync
const Admin = require('./models/Admin');
const Exam = require('./models/Exam');
const Question = require('./models/Question');
const Invitation = require('./models/Invitation');
const Candidate = require('./models/Candidate');
const Attempt = require('./models/Attempt');

const app = express();

// Middleware
app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'https://localhost:5173',
        'https://assessmentcenter.mercuresolution.com'
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Helmet after CORS to ensure CORS headers aren't stripped
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api', require('./routes/publicRoutes'));

// Basic Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Backend is running' });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    // 1. Connect to Database
    await connectDB();

    // 2. Sync Models (Only for dev, use migrations for production)
    if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully.');
    }

    // 3. Start Listening
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
