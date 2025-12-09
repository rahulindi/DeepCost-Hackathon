# Compliance & Governance Feature Specification

## Overview
Enterprise-grade compliance and governance framework for managing cost policies, enforcing tagging standards, and maintaining audit trails.

## Problem Statement
- No enforcement of cost management policies
- Inconsistent tagging across resources
- Lack of audit trail for cost-related actions
- Difficulty proving compliance to stakeholders

## Solution
Implement governance framework with:
1. Policy definition and enforcement
2. Tag compliance scoring
3. Comprehensive audit logging
4. Compliance reporting

## Requirements

### Functional Requirements

#### Policy Management
- [ ] Create cost policies (budget limits, approval thresholds)
- [ ] Edit existing policies
- [ ] Activate/deactivate policies
- [ ] Policy violation alerts

#### Tag Compliance
- [ ] Define required tags per resource type
- [ ] Calculate compliance score (0-100%)
- [ ] List non-compliant resources
- [ ] Auto-remediation suggestions

#### Audit Trail
- [ ] Log all user actions
- [ ] Track configuration changes
- [ ] Record cost-related events
- [ ] Export audit logs

### Non-Functional Requirements
- [ ] Audit logs retained 90+ days
- [ ] Real-time compliance scoring
- [ ] Role-based policy management

## Technical Design

### Database Schema
```sql
CREATE TABLE policies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  type VARCHAR(50),
  conditions JSONB,
  actions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP
);

CREATE TABLE tag_compliance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  resource_id VARCHAR(255),
  resource_type VARCHAR(50),
  required_tags TEXT[],
  actual_tags JSONB,
  compliance_score INTEGER,
  scanned_at TIMESTAMP
);
```

### API Endpoints
- `GET /api/governance/policies` - List policies
- `POST /api/governance/policies` - Create policy
- `PUT /api/governance/policies/:id` - Update policy
- `DELETE /api/governance/policies/:id` - Delete policy
- `GET /api/governance/compliance` - Get compliance score
- `GET /api/governance/audit-logs` - Get audit logs

### Frontend Component
```
ComplianceGovernance.tsx
├── Policy List with CRUD
├── Compliance Score Dashboard
├── Non-Compliant Resources Table
├── Audit Log Viewer
└── Compliance Report Generator
```

## Implementation Tasks

### Task 1: Policy Engine
- Create policy CRUD operations
- Implement policy evaluation
- Add violation detection

### Task 2: Tag Compliance
- Scan resources for tags
- Calculate compliance scores
- Generate remediation suggestions

### Task 3: Audit System
- Implement audit logging middleware
- Create audit log viewer
- Add export functionality

## Policy Types

| Type | Description | Example |
|------|-------------|---------|
| Budget | Spending limits | Max $10,000/month |
| Approval | Require approval above threshold | Approve > $500 |
| Tagging | Required tags | Environment, Owner |
| Resource | Resource restrictions | No m5.24xlarge |

## Success Metrics
- Policy compliance rate > 90%
- Tag compliance score > 85%
- Audit log coverage 100%
- Violation response time < 24 hours
