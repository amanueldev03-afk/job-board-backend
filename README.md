# Job Board Backend API

## 🚀 Features

- 🔐 JWT Authentication with Refresh Tokens
- 📧 Email Verification (Gmail SMTP)
- 👤 User Management (Candidates & Companies)
- 📝 Job Posting & Management
- 📄 Job Applications with Status Tracking
- 📁 File Upload (Avatar, Resume, Logo)
- 🛡️ Rate Limiting for Security
- ✅ Email Validation (MX/SMTP checks)
- 🔄 API Versioning Ready
- 📊 PostgreSQL with Prisma ORM
- 🔷 TypeScript for type safety

## 🛠️ Tech Stack

- Node.js
- Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- JWT for Authentication
- Nodemailer for Emails
- Multer for File Upload
- Express Validator
- Morgan for Logging

## 📋 Prerequisites

- Node.js (v18+)
- PostgreSQL
- Gmail Account (for email)

## 🔧 Installation

```bash
# Clone repository
git clone https://github.com/amanueldev03-afk/job-board-backend.git
cd job-board-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your credentials
# Set DATABASE_URL to your PostgreSQL connection string
# Example: DATABASE_URL="postgresql://username:password@localhost:5432/job_board"

# Start PostgreSQL server
# On Linux: sudo systemctl start postgresql
# On Mac: brew services start postgresql

# Create database
# psql -U postgres
# CREATE DATABASE job_board;

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start server in development mode
npm run dev

# Build for production
npm run build

# Start server in production mode
npm start
```

## 📝 Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CLIENT_URL` - Frontend URL for CORS
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` - Email configuration
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - Cloudinary configuration

## 🏃 Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start

# Prisma Studio (database GUI)
npm run prisma:studio

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🧪 Testing

```bash
# Run tests
npm test
```

## 📊 API Endpoints

### Health Check
- `GET /health` - Server health status with database connection
- `GET /api/status` - API status information

### Authentication (To be implemented)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Jobs (To be implemented)
- `GET /api/jobs` - Get all jobs with filters
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create new job (company only)
- `PUT /api/jobs/:id` - Update job (company only)
- `DELETE /api/jobs/:id` - Delete job (company only)

### Applications (To be implemented)
- `POST /api/applications/:jobId/apply` - Apply for job
- `GET /api/applications` - Get my applications
- `GET /api/applications/:id` - Get application by ID
- `PUT /api/applications/:id/status` - Update application status (company only)

## 🗄️ Database Schema

### Users
- UUID primary key
- Email, password, name
- Role (candidate/company/admin)
- Profile information
- Email verification
- Password reset

### Companies
- UUID primary key
- User reference (one-to-one)
- Company name, description, location
- Industry, company size, benefits
- Rating system

### Jobs
- UUID primary key
- Company reference (many-to-one)
- Title, description, requirements
- Location, compensation, employment type
- Skills, benefits, deadline
- Status tracking (draft, published, closed, expired)

### Applications
- UUID primary key
- Job and candidate references
- Status tracking (pending, reviewed, shortlisted, rejected, hired, withdrawn)
- Documents (resume, cover letter, portfolio)
- Interview details and timeline

### RefreshTokens
- UUID primary key
- Token string (unique)
- User reference
- Expiration date
- Device info and IP tracking

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention (Prisma ORM)
- Type safety with TypeScript

## 📁 Project Structure

```
job-board-backend/
├── prisma/
│   ├── schema.prisma          # Prisma schema definition
│   └── migrations/            # Database migrations
├── src/
│   ├── config/
│   │   └── index.ts           # Environment & runtime configuration
│   ├── lib/
│   │   └── prisma.ts          # Prisma client with PostgreSQL adapter
│   ├── middleware/
│   │   └── errorHandler.ts    # Centralized error & 404 handling
│   ├── routes/
│   │   └── health.ts          # Health check and status routes
│   ├── app.ts                 # Express application configuration
│   └── index.ts               # Application entry point & server lifecycle
├── .env.example               # Environment variables template
├── prisma.config.ts           # Prisma 7 configuration file
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
└── README.md                  # Project documentation
```
