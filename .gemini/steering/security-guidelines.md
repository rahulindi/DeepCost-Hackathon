---
inclusion: always
---

# Security Guidelines

## Overview
Security is paramount for a cost management application that handles sensitive AWS credentials and financial data.

## Authentication & Authorization

### JWT Token Management
```javascript
// Token generation
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Token verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

```javascript
const validatePassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
};
```

## Data Protection

### Credential Encryption
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
```

### Data Isolation
```javascript
// ALWAYS filter by user_id in queries
const getCostData = async (userId) => {
  // ✅ Correct - includes user_id filter
  const result = await db.query(
    'SELECT * FROM cost_records WHERE user_id = $1',
    [userId]
  );
  return result.rows;
};

// ❌ NEVER do this - exposes all users' data
const getAllCostData = async () => {
  const result = await db.query('SELECT * FROM cost_records');
  return result.rows;
};
```

## Input Validation

### SQL Injection Prevention
```javascript
// ✅ Use parameterized queries
const getUser = async (email) => {
  return await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
};

// ❌ NEVER concatenate user input
const getUser = async (email) => {
  return await db.query(`SELECT * FROM users WHERE email = '${email}'`);
};
```

### XSS Prevention
```javascript
// Sanitize user input before rendering
const sanitizeHtml = require('sanitize-html');

const sanitizeInput = (input) => {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  });
};
```

### Request Validation
```javascript
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    next();
  };
};
```

## API Security

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

app.use('/api/', apiLimiter);
```

### CORS Configuration
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Security Headers
```javascript
const helmet = require('helmet');

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
  }
}));
```

## Secrets Management

### Environment Variables
```bash
# .env (NEVER commit this file)
JWT_SECRET=your-256-bit-secret
ENCRYPTION_KEY=your-32-byte-encryption-key
DATABASE_URL=postgresql://user:pass@host:5432/db
GEMINI_API_KEY=your-gemini-api-key
```

### .gitignore Requirements
```
# Always ignore
.env
.env.local
.env.production
*.pem
*.key
secrets/
```

## Audit Logging

### Log Security Events
```javascript
const logSecurityEvent = async (event) => {
  await db.query(
    `INSERT INTO security_logs (user_id, event_type, ip_address, details, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [event.userId, event.type, event.ip, JSON.stringify(event.details)]
  );
};

// Log on sensitive actions
await logSecurityEvent({
  userId: req.user.id,
  type: 'AWS_CREDENTIALS_UPDATED',
  ip: req.ip,
  details: { action: 'update' }
});
```

## Security Checklist

- [ ] All endpoints require authentication
- [ ] Passwords are hashed with bcrypt
- [ ] AWS credentials are encrypted at rest
- [ ] SQL queries use parameterization
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Sensitive data is not logged
- [ ] .env files are gitignored
- [ ] Input validation on all endpoints
