const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');

// Import Models
const Admin = require('./models/Admin');
const Exam = require('./models/Exam');
const Question = require('./models/Question');
const Invitation = require('./models/Invitation');
const Candidate = require('./models/Candidate');
const Attempt = require('./models/Attempt');

const app = express();


// =======================
// ✅ CORS CONFIG (FIXED)
// =======================

const allowedOrigins = [
    'https://assessmentcenter.mercuresolution.com', // Vercel frontend
    'http://localhost:5173' // local testing
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true); // allow postman/mobile

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.log("❌ CORS Blocked:", origin);
            return callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// handle preflight requests
app.options('*', cors());


// =======================
// SECURITY
// =======================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));


// =======================
// BODY PARSER
// =======================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));


// =======================
// REQUEST LOGGER
// =======================
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});


// =======================
// ROUTES
// =======================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api', require('./routes/publicRoutes'));


// =======================
// HEALTH CHECK
// =======================
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Backend running 🚀' });
});


// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        console.log("✅ Database connected");

        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database synced');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Allowed CORS: ${allowedOrigins.join(', ')}`);
        });

    } catch (error) {
        console.error("❌ Server start error:", error);
    }
};

startServer();