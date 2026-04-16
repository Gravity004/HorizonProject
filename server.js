require('dotenv').config({ populate: true });
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

// Import Config
require('./config/passport');
const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 12500;

if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined in environment variables!');
}

// Trust Proxy for Vercel
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://horizon-project-nine.vercel.app',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://localhost:12500',
    'http://localhost:3000',
].filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
    origin: (origin, callback) => {
        // Allow same-origin (no origin) and known origins
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        // In production: block unknown origins. In dev: allow all
        if (isProduction) return callback(new Error(`CORS blocked: ${origin}`), false);
        callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── MongoDB connection — single pool, capped for M0 free tier ──────────────
const mongoClientPromise = database.connect();

const MongoStore = require('connect-mongo');

// Session Setup — MongoStore reuses the SAME connection (no second pool)
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: process.env.MONGODB_URI ? MongoStore.create({
        clientPromise: mongoClientPromise,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }) : undefined,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
}));

// Passport Middleware
app.use(passport?.initialize());
app.use(passport?.session());

// Database connection is managed via config/database instance

// Static Files
app.use('/assets', express.static(path.join(__dirname, 'frontend/dist/assets')));
app.use(express.static(path.join(__dirname, 'assets'))); // Original assets for components

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// API Routes
const shopRoutes = require('./routes/shop');
const craftRoutes = require('./routes/craft');
const bankRoutes = require('./routes/bank');
const usersRoutes = require('./routes/users');
const giftRoutes = require('./routes/gift');
const forestRoutes = require('./routes/forest');
const questRoutes = require('./routes/quests');
const petRoutes = require('./routes/pets');
const divinationRoutes = require('./routes/divination');
const classroomRoutes = require('./routes/classroom');

app.use('/api/shop', shopRoutes);
app.use('/api/craft', craftRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/gift', giftRoutes);
app.use('/api/forest', forestRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/divination', divinationRoutes);
app.use('/api/classroom', classroomRoutes);

// Serve Vue SPA (only in production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'frontend/dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
    });
}

app.get(['/classroom', '/classroom/*path'], checkGuildMembership, (req, res) => {
    res.sendFile(path.join(__dirname, 'classroom.html'));
});

// Serve Vue SPA (only in production, only if dist folder was built)
if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const distPath = path.join(__dirname, 'frontend/dist');
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('/{*path}', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }
}

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;



