# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Japanese corporate peer evaluation viewing application** (他己評価閲覧アプリ) designed to allow ~70 employees to view peer evaluations they've received from weekly surveys. The project aims to foster positive organizational culture through peer feedback transparency.

**Current Status**: Fully implemented with React frontend, Node.js/Express backend, and SQLite database.

## Technology Stack

- **Frontend**: React 19, React Router, Axios
- **Backend**: Node.js, Express, JWT authentication
- **Database**: SQLite with schema in `server/database/schema.sql`
- **File Processing**: XLSX library for Excel import
- **Security**: bcrypt, helmet, rate limiting, CORS, JWT
- **Development**: nodemon, concurrently, Jest, ESLint

## Development Commands

### Setup
```bash
# Install all dependencies (root + client)
npm run install:all

# Or install separately
npm install                  # Backend dependencies
cd client && npm install    # Frontend dependencies
```

### Development
```bash
# Start both frontend and backend concurrently
npm run dev

# Or start separately
npm run server:dev           # Backend only (nodemon)
npm run client:dev          # Frontend only (React dev server)

# Manual start
node server/index.js        # Backend (port 5000)
cd client && npm start      # Frontend (port 3000)
```

### Production
```bash
npm run build              # Build React app
npm start                  # Production server
```

### Testing & Linting
```bash
npm test                   # Run Jest tests (backend)
cd client && npm test      # Run React tests (frontend)
npm run lint              # ESLint check

# Run single test file
npm test -- --testNamePattern="specific test name"
cd client && npm test -- --testNamePattern="specific test name"
```

## Architecture Overview

### Backend Structure (`server/`)
- **`index.js`**: Main Express server with security middleware (helmet, rate limiting, CORS)
- **`database/`**: SQLite database management
  - `init.js`: Database initialization and connection
  - `schema.sql`: Database schema with 4 main tables
- **`routes/`**: API endpoints
  - `auth.js`: Login/register with JWT
  - `evaluations.js`: Peer evaluation CRUD operations
  - `admin.js`: Excel import and user management
- **`middleware/auth.js`**: JWT authentication middleware with admin protection

### Frontend Structure (`client/src/`)
- **`App.js`**: Main React app with routing and authentication state
- **`components/`**: React components
  - `LoginPage.js`/`RegisterPage.js`: Authentication forms
  - `Dashboard.js`: Overview with statistics
  - `EvaluationsPage.js`: Main evaluation viewing interface
  - `SettingsPage.js`: User settings and evaluation management
  - `AdminPage.js`: Admin panel for data import
  - `Navbar.js`: Navigation component

### Database Schema
- **`users`**: User accounts with admin flags
- **`evaluations`**: Peer evaluations with 4 categories
- **`participants`**: Official name list for standardization
- **`name_mappings`**: Handle Japanese name variations (渡邉/渡辺)

## Key Features

### Authentication
- Company domain email restriction (set via `COMPANY_DOMAIN` env var)
- JWT-based session management
- Admin users have additional privileges

### Evaluation Categories
1. **Value Practice** (value_practice): 3つのバリューの実践 (横軸, 感動, 技研)
2. **Principle Practice** (principle_practice): プリンシプルの実践
3. **Contribution** (contribution): チームに貢献
4. **Value Promotion** (value_promotion): チャットでの貢献

### Admin Functions
- Excel import from Microsoft Forms exports
- Participant list management for name standardization
- User management and system statistics

## Environment Setup

Create `.env` file in root directory:
```
# JWT設定
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# サーバー設定
PORT=5000
NODE_ENV=development

# 会社ドメイン設定
COMPANY_DOMAIN=company.com

# Gmail SMTP設定（パスワードリセット機能用）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-gmail@gmail.com

# パスワードリセット設定
RESET_PASSWORD_EXPIRY_HOURS=1
FRONTEND_URL=http://localhost:3000
```

## Initial Data

Default admin accounts (password: `password`):
- admin1@company.com
- admin2@company.com  
- admin3@company.com

**Note**: The README.md incorrectly shows password as `admin123`, but the actual implementation uses `password` (verified by bcrypt hash in schema.sql).

## Development Notes

- Frontend proxies API calls to backend via `"proxy": "http://localhost:5000"` in client/package.json
- Database auto-initializes on server startup with SQLite file at `server/database/yak_result.db`
- Excel import expects specific column structure from Microsoft Forms (detailed in SETUP.md)
- Japanese text encoding is handled throughout the application
- Rate limiting: 100 requests per 15 minutes per IP
- File uploads limited to 10MB via multer
- CSS modules are organized by component in `client/src/styles/`
- Password reset functionality fully implemented with Gmail SMTP support
- Password reset rate limiting: 3 attempts per 5 minutes per IP
- Secure token generation using 32-byte random tokens
- Configurable token expiry (default 1 hour)
- Password strength validation and UI indicators

## Security Considerations

- JWT tokens for API authentication
- bcrypt password hashing
- Helmet security headers
- CORS configuration
- Company domain email validation
- Users can only access their own evaluation data
- Admin-only routes protected by middleware

## Gmail SMTP Setup for Password Reset

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password
1. Go to Security → 2-Step Verification → App passwords
2. Select "Mail" and "Other (custom name)"
3. Enter "Yak Result App" as the custom name
4. Click "Generate"
5. Copy the 16-character app password

### Step 3: Configure Environment Variables
Update your `.env` file with:
```bash
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=your-gmail-address@gmail.com  # Optional, defaults to EMAIL_USER
```

### Step 4: Test Configuration
1. Start the server with `npm run server:dev`
2. Try the password reset feature at `/forgot-password`
3. Check server logs for successful email sending

### Troubleshooting
- **"Invalid login"**: Verify 2FA is enabled and app password is correct
- **"Connection refused"**: Check firewall/proxy settings
- **"Rate limit exceeded"**: Gmail has sending limits; wait and retry