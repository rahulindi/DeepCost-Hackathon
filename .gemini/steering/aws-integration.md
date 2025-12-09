---
inclusion: fileMatch
fileMatchPattern: "**/*aws*.{js,ts,tsx}"
---

# AWS Integration Guidelines

## Overview
Guidelines for integrating with AWS services in the Cost Tracker application.

## AWS SDK v3 Usage

### Client Initialization
```javascript
const { CostExplorerClient } = require('@aws-sdk/client-cost-explorer');
const { EC2Client } = require('@aws-sdk/client-ec2');

// Always create clients with user-specific credentials
const createCostExplorerClient = (credentials) => {
  return new CostExplorerClient({
    region: 'us-east-1', // Cost Explorer only available in us-east-1
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    }
  });
};
```

### Cost Explorer API Patterns

#### Get Cost and Usage
```javascript
const { GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');

const getCostData = async (client, startDate, endDate) => {
  const command = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: startDate, // YYYY-MM-DD format
      End: endDate
    },
    Granularity: 'DAILY',
    Metrics: ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
    GroupBy: [
      { Type: 'DIMENSION', Key: 'SERVICE' }
    ]
  });
  
  return await client.send(command);
};
```

#### Get Cost Forecast
```javascript
const { GetCostForecastCommand } = require('@aws-sdk/client-cost-explorer');

const getForecast = async (client) => {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const command = new GetCostForecastCommand({
    TimePeriod: {
      Start: today.toISOString().split('T')[0],
      End: endOfMonth.toISOString().split('T')[0]
    },
    Metric: 'BLENDED_COST',
    Granularity: 'MONTHLY'
  });
  
  return await client.send(command);
};
```

## Credential Management

### Storage
- Store credentials encrypted in database
- Never log credentials
- Use environment variables for service accounts

### Validation
```javascript
const validateCredentials = async (accessKeyId, secretAccessKey) => {
  try {
    const client = new STSClient({
      credentials: { accessKeyId, secretAccessKey }
    });
    const command = new GetCallerIdentityCommand({});
    const response = await client.send(command);
    return { valid: true, accountId: response.Account };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};
```

### Per-User Isolation
```javascript
// Always fetch credentials for the authenticated user
const getUserCredentials = async (userId) => {
  const result = await db.query(
    'SELECT access_key_id, secret_access_key FROM aws_credentials WHERE user_id = $1',
    [userId]
  );
  
  if (!result.rows[0]) {
    throw new Error('AWS credentials not configured');
  }
  
  return {
    accessKeyId: decrypt(result.rows[0].access_key_id),
    secretAccessKey: decrypt(result.rows[0].secret_access_key)
  };
};
```

## Error Handling

### Common AWS Errors
```javascript
try {
  const data = await client.send(command);
} catch (error) {
  if (error.name === 'AccessDeniedException') {
    throw new Error('Insufficient AWS permissions. Please check IAM policy.');
  }
  if (error.name === 'InvalidAccessKeyId') {
    throw new Error('Invalid AWS credentials. Please reconfigure.');
  }
  if (error.name === 'ExpiredToken') {
    throw new Error('AWS credentials expired. Please update.');
  }
  if (error.name === 'ThrottlingException') {
    // Implement exponential backoff
    await sleep(1000);
    return retry(command);
  }
  throw error;
}
```

## Required IAM Permissions

### Minimum Policy for Cost Tracking
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetReservationUtilization",
        "ce:GetSavingsPlansUtilization",
        "ce:GetAnomalies"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeAddresses",
        "ec2:DescribeSnapshots"
      ],
      "Resource": "*"
    }
  ]
}
```

## Rate Limiting

### Cost Explorer Limits
- 5 requests per second
- Implement request queuing for bulk operations

```javascript
const rateLimiter = {
  queue: [],
  processing: false,
  
  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.process();
    });
  },
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    
    const { request, resolve, reject } = this.queue.shift();
    try {
      const result = await request();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    await sleep(200); // 5 requests per second
    this.processing = false;
    this.process();
  }
};
```

## Testing AWS Integrations

### Mock Clients for Tests
```javascript
const mockCostExplorerClient = {
  send: jest.fn().mockResolvedValue({
    ResultsByTime: [
      {
        TimePeriod: { Start: '2024-12-01', End: '2024-12-02' },
        Groups: [
          {
            Keys: ['Amazon EC2'],
            Metrics: { BlendedCost: { Amount: '100.00' } }
          }
        ]
      }
    ]
  })
};
```
