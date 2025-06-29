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
- **Security**: bcrypt, helmet, rate limiting

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
npm test                   # Run Jest tests
npm run lint              # ESLint check
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
- **`middleware/auth.js`**: JWT authentication middleware

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
3. **Contribution** (contribution): プロジェクトメンバー評価（貢献度）
4. **Value Promotion** (value_promotion): プロジェクトメンバー評価（バリュー実践）

### Admin Functions
- Excel import from Microsoft Forms exports
- Participant list management for name standardization
- User management and system statistics

## Environment Setup

Create `.env` file in root directory:
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
COMPANY_DOMAIN=company.com
```

## Initial Data

Default admin accounts (password: `password`):
- admin1@company.com
- admin2@company.com  
- admin3@company.com

## Development Notes

- Frontend proxies API calls to backend via `"proxy": "http://localhost:5000"` in client/package.json
- Database auto-initializes on server startup
- Excel import expects specific column structure from Microsoft Forms
- Japanese text encoding is handled throughout the application
- Rate limiting: 100 requests per 15 minutes
- File uploads limited to 10MB

## Security Considerations

- JWT tokens for API authentication
- bcrypt password hashing
- Helmet security headers
- CORS configuration
- Company domain email validation
- Users can only access their own evaluation data
- Admin-only routes protected by middleware