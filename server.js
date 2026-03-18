require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const cors = require('cors');

// Import Config
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 12500;

// Rate Limiter to prevent spam/freezing
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    message: { message: "Too many requests from this IP, please try again later." }
});
app.use('/api/', limiter);
app.use('/auth/', limiter);

if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined in environment variables!');
}

// Trust Proxy for Vercel
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://localhost:12500',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(null, true); // ให้ผ่านทั้งหมดในกรณี dev
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const MongoStore = require('connect-mongo');

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: (process.env.MONGODB_URI) ? MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }) : undefined,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // True on Vercel
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
}));

// Passport Middleware
app.use(passport?.initialize());
app.use(passport?.session());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Static Files
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'assets/images/Eternity1.png')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Serve root HTML files
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/rachata_school.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'rachata_school.html'));
});

app.get('/rachata_house.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'rachata_house.html'));
});

app.get('/winchester.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'winchester.html'));
});

app.get('/student_council.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'student_council.html'));
});

app.get('/world_guide.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'world_guide.html'));
});

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

app.use('/api/shop', shopRoutes);
app.use('/api/craft', craftRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/gift', giftRoutes);
app.use('/api/forest', forestRoutes);

const { checkGuildMembership } = require('./middleware/auth');

// ✅ คนที่ออก guild จะถูก redirect ออกทันที
app.get(/^\/dashboard/, checkGuildMembership, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve Vue SPA (only in production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'frontend/dist')));
    app.get('/{*path}', (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
    });
}

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;



