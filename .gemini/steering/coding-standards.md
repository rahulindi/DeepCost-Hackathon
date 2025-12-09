---
inclusion: always
---

# Coding Standards & Conventions

## Overview
This document defines the coding standards for the AWS Cost Tracker project. All code contributions must follow these guidelines.

## TypeScript/JavaScript Standards

### General Rules
- Use TypeScript for all frontend code
- Use ES6+ features (arrow functions, destructuring, template literals)
- Prefer `const` over `let`, never use `var`
- Use meaningful variable and function names
- Maximum line length: 100 characters
- Use 2-space indentation

### Naming Conventions
```typescript
// Components: PascalCase
const WorldClassDashboard: React.FC = () => {}

// Functions: camelCase
const fetchCostData = async () => {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:3001'

// Interfaces: PascalCase with 'I' prefix optional
interface CostData {
  totalCost: number;
  services: ServiceBreakdown[];
}

// Types: PascalCase
type TimeRange = '7' | '30' | '90';
```

### React Component Structure
```typescript
// 1. Imports (external, then internal)
import React, { useState, useEffect } from 'react';
import { Box, Card } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

// 2. Interface definitions
interface Props {
  data: CostData;
  onRefresh: () => void;
}

// 3. Component definition
export const MyComponent: React.FC<Props> = ({ data, onRefresh }) => {
  // 4. Hooks (state, effects, custom hooks)
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();
  
  useEffect(() => {
    // Effect logic
  }, [dependency]);
  
  // 5. Event handlers
  const handleClick = () => {};
  
  // 6. Render helpers
  const renderContent = () => {};
  
  // 7. Return JSX
  return <Box>{/* content */}</Box>;
};
```

## Backend Standards (Node.js/Express)

### File Structure
```
src/
├── routes/          # API route definitions
├── services/        # Business logic
├── middleware/      # Express middleware
├── models/          # Data models
├── utils/           # Helper functions
└── config/          # Configuration
```

### Route Definition Pattern
```javascript
// routes/costRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const costService = require('../services/awsCostService');

// GET /api/cost-data
router.get('/cost-data', authenticateToken, async (req, res) => {
  try {
    const { days, startDate, endDate } = req.query;
    const userId = req.user.id;
    
    const data = await costService.getCostData(userId, { days, startDate, endDate });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching cost data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### Service Pattern
```javascript
// services/costService.js
class CostService {
  async getCostData(userId, options) {
    // Validate inputs
    if (!userId) throw new Error('User ID required');
    
    // Business logic
    const credentials = await this.getCredentials(userId);
    const costData = await this.fetchFromAWS(credentials, options);
    
    return this.transformData(costData);
  }
}

module.exports = new CostService();
```

## Error Handling

### Frontend
```typescript
try {
  const response = await axios.get('/api/cost-data');
  if (response.data.success) {
    setCostData(response.data.data);
  } else {
    setError(response.data.error);
  }
} catch (error) {
  console.error('API Error:', error);
  setError('Failed to fetch data. Please try again.');
}
```

### Backend
```javascript
// Use consistent error response format
res.status(400).json({
  success: false,
  error: 'Validation failed',
  details: ['Field X is required', 'Field Y must be positive']
});
```

## API Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "page": 1,
    "total": 100,
    "timestamp": "2024-12-04T10:00:00Z"
  }
}
```

## Security Guidelines
- Never commit secrets or API keys
- Always validate user input
- Use parameterized queries for database
- Implement rate limiting on APIs
- Use HTTPS in production
- Sanitize data before rendering

## Testing Requirements
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for React components
- Minimum 70% code coverage for new features

## Git Commit Messages
```
feat: Add anomaly detection service
fix: Resolve dashboard loading issue
docs: Update API documentation
refactor: Simplify cost calculation logic
test: Add unit tests for budget service
```
