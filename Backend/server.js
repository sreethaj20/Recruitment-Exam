const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');

// Import Models
require('./models/Admin');
require('./models/Exam');
require('./models/Question');
require('./models/Invitation');
require('./models/Candidate');
require('./models/Attempt');

const app = express();


const allowedOrigins = [
    'https://assessmentcenter.mercuresolution.com', // Vercel frontend
    'http://localhost:5173' // Local testing
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.log("❌ Blocked by CORS:", origin);
            return callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));


// ===============================
// 🔐 SECURITY
// ===============================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));


// ===============================
// 🧾 BODY PARSERS
// ===============================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));


// ===============================
// 📋 REQUEST LOGGER
// ===============================
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});


// ===============================
// 🚀 ROUTES
// ===============================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api', require('./routes/publicRoutes'));


// ===============================
// ❤️ HEALTH CHECK
// ===============================
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Backend is running 🚀' });
});


// ===============================
// ▶ START SERVER
// ===============================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        console.log("✅ Database connected");

        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log("✅ Database synced (dev mode)");
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Allowed Origins: ${allowedOrigins.join(', ')}`);
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();