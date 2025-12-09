---
inclusion: always
---

# AWS Cost Tracker Pro - Project Context

## Project Overview
AWS Cost Tracker Pro is a full-stack application for monitoring and analyzing AWS costs with real-time analytics, ML-powered forecasting, and enterprise-grade security.

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI v5
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh tokens
- **AWS Integration**: AWS SDK v3 (Cost Explorer, EC2, S3)
- **AI**: Google Gemini API for cost analysis
- **Charts**: Chart.js + react-chartjs-2

### Directory Structure
```
aws-cost-tracker/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (Theme, Auth)
│   │   ├── config/         # Configuration
│   │   └── utils/          # Utility functions
│   └── public/
├── backend/
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models
│   │   └── config/         # Configuration
│   └── migrations/         # Database migrations
└── .kiro/
    ├── specs/              # Feature specifications
    ├── steering/           # Project guidelines
    └── hooks/              # Agent automation
```

## Key Features

### 1. Cost Dashboard
- Real-time AWS cost monitoring
- Period-over-period comparison
- Month-end cost projection
- Efficiency scoring
- Service breakdown charts

### 2. AI Cost Assistant
- Natural language cost queries
- Powered by Google Gemini
- Context-aware responses
- Optimization recommendations

### 3. Anomaly Detection
- Statistical anomaly detection
- Severity classification
- Root cause suggestions
- Alert notifications

### 4. Resource Lifecycle Management
- Scheduled start/stop for EC2
- Orphan resource detection
- Rightsizing recommendations
- Tagging intelligence

### 5. Reserved Instance Analysis
- RI utilization tracking
- Coverage recommendations
- Savings calculations

### 6. Webhooks & Data Lake
- Event-driven notifications
- Export to S3/external systems
- Multiple format support

### 7. Compliance & Governance
- Policy management
- Tag compliance scoring
- Audit trails

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token

### Cost Data
- `GET /api/cost-data` - Get cost data with date range
- `GET /api/cost-forecast` - Get AWS cost forecast
- `GET /api/trend-data` - Get trend analysis data

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `DELETE /api/budgets/:id` - Delete budget

### Anomalies
- `GET /api/anomalies` - Get detected anomalies
- `GET /api/anomalies/summary` - Get anomaly summary

### Resources
- `GET /api/lifecycle/schedules` - List schedules
- `POST /api/lifecycle/schedules` - Create schedule
- `GET /api/orphan-resources` - Get orphaned resources

### AI Assistant
- `POST /api/ai/chat` - Send chat message
- `GET /api/ai/suggestions` - Get proactive suggestions

## Environment Variables

### Backend (.env)
```
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/costtracker
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-byte-key
GEMINI_API_KEY=your-gemini-key
```

### Frontend
```
REACT_APP_API_URL=http://localhost:3001
```

## Running the Application

### Development
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm start
```

### Production
```bash
# Build frontend
cd frontend && npm run build

# Start backend
cd backend && npm start
```

## Database Schema

### Core Tables
- `users` - User accounts
- `aws_credentials` - Encrypted AWS credentials per user
- `cost_records` - Cached cost data
- `budgets` - Budget alerts
- `lifecycle_schedules` - Resource schedules
- `webhooks` - Webhook configurations
- `exports` - Data lake exports

## Testing

### Backend Tests
```bash
cd backend && npm test
```

### Frontend Tests
```bash
cd frontend && npm test
```

## Deployment Targets
- Frontend: Vercel, Netlify, AWS Amplify
- Backend: Railway, Render, AWS ECS
- Database: Supabase, Neon, AWS RDS
