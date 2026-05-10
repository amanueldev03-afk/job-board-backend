const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// ============ CONFIGURATION IMPORTS ============
const env = require('./config/env');
const connectDB = require('./config/db');
const jwtConfig = require('./config/jwtConfig');

// ============ MODEL IMPORTS ============
const { User, Company, Job, Application, initializeRelations } = require('./models');

// ============ MIDDLEWARE IMPORTS ============
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ============ ROUTE IMPORTS ============
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const companyRoutes = require('./routes/companyRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

// ============ INITIALIZE EXPRESS ============
const app = express();

// ============ BUILT-IN MIDDLEWARE ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============ THIRD-PARTY MIDDLEWARE ============
app.use(helmet());
app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
}));

// ============ SESSION & PASSPORT (Add this) ============
const session = require('express-session');
const passport = require('./config/passport');

// Session middleware (required for passport)
app.use(session({
    secret: env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: env.isProduction,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// ============ SERVE STATIC FILES ============
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============ REQUEST LOGGING MIDDLEWARE ============
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============ RATE LIMITING ============
const { generalLimiter } = require('./middleware/rateLimiter');
app.use('/api/', generalLimiter);

// ============ HEALTH CHECK & STATUS ENDPOINTS ============
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'Job Board API is running',
        version: '1.0.0',
        environment: env.NODE_ENV,
        jwtConfigured: !!jwtConfig.secret,
        jwtExpiry: jwtConfig.expiresIn
    });
});

// ============ API ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

// ============ TEST ENDPOINTS (Development only) ============
if (env.NODE_ENV === 'development') {
    app.get('/api/test/users', async (req, res) => {
        try {
            const users = await User.find().select('-password').limit(5);
            res.json({ success: true, count: users.length, data: users });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/test/companies', async (req, res) => {
        try {
            const companies = await Company.find().limit(5);
            res.json({ success: true, count: companies.length, data: companies });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/test/jobs', async (req, res) => {
        try {
            const jobs = await Job.find().populate('company', 'companyName logo').limit(5);
            res.json({ success: true, count: jobs.length, data: jobs });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/test/applications', async (req, res) => {
        try {
            const apps = await Application.find()
                .populate('job', 'title')
                .populate('candidate', 'name email')
                .limit(5);
            res.json({ success: true, count: apps.length, data: apps });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/test/seed', async (req, res) => {
        try {
            const testUser = await User.create({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                role: 'company'
            });

            const testCompany = await Company.create({
                user: testUser._id,
                companyName: 'Test Tech Corp',
                description: 'A test technology company',
                location: {
                    address: '123 Test St',
                    city: 'Test City',
                    country: 'USA'
                },
                industry: 'Technology'
            });

            const testJob = await Job.create({
                company: testCompany._id,
                title: 'Test Developer',
                description: 'This is a test job posting for verification purposes.',
                requirements: ['JavaScript', 'Testing'],
                location: 'Remote',
                compensation: { salaryMin: 50000, salaryMax: 80000 },
                employmentType: 'full-time',
                experienceLevel: 'junior',
                skills: ['javascript', 'testing'],
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });

            res.json({ success: true, message: 'Sample data created', data: { user: testUser, company: testCompany, job: testJob } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.get('/api/test/stats', async (req, res) => {
        try {
            const [userCount, companyCount, jobCount, applicationCount] = await Promise.all([
                User.countDocuments(),
                Company.countDocuments(),
                Job.countDocuments(),
                Application.countDocuments()
            ]);

            res.json({
                success: true,
                data: {
                    counts: { users: userCount, companies: companyCount, jobs: jobCount, applications: applicationCount }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
}

// ============ JOB SCHEDULER ============
const scheduleDeletionJob = require('./jobs/deletionJob');
scheduleDeletionJob();

// ============ ERROR HANDLERS (MUST BE LAST) ============
app.use(notFound);
app.use(errorHandler);

// ============ DATABASE CONNECTION & SERVER START ============
const startServer = async () => {
    try {
        await connectDB();
        initializeRelations();

        console.log('\n📊 Model Relationships:');
        console.log('   User ↔ Company (One-to-One)');
        console.log('   Company ↔ Job (One-to-Many)');
        console.log('   Job ↔ Application (One-to-Many)');
        console.log('   User ↔ Application (One-to-Many)');

        const PORT = env.PORT;
        app.listen(PORT, () => {
            console.log(`\n🚀 Server Started Successfully!`);
            console.log(`   Environment: ${env.NODE_ENV}`);
            console.log(`   Port: ${PORT}`);
            console.log(`   Client URL: ${env.CLIENT_URL}`);
            console.log(`\n📋 Available Routes:`);
            console.log(`   POST   /api/auth/register`);
            console.log(`   POST   /api/auth/login`);
            console.log(`   POST   /api/auth/logout`);
            console.log(`   GET    /api/users/me`);
            console.log(`   PUT    /api/users/me`);
            console.log(`   GET    /api/jobs`);
            console.log(`   GET    /api/jobs/:id`);
            console.log(`   POST   /api/jobs`);
            console.log(`   POST   /api/applications/:jobId/apply`);
            console.log(`\n📋 Test Endpoints (Development):`);
            console.log(`   GET    /health`);
            console.log(`   GET    /api/status`);
            console.log(`\n💡 Press Ctrl+C to stop the server\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// ============ PROCESS HANDLERS ============
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});

startServer();