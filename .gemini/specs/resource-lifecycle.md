# Resource Lifecycle Management Feature Specification

## Overview
Automated resource lifecycle management to optimize costs by scheduling, rightsizing, and cleaning up AWS resources.

## Problem Statement
- Idle resources waste money (dev/test environments running 24/7)
- Orphaned resources accumulate over time
- Manual cleanup is error-prone and time-consuming
- No visibility into resource utilization patterns

## Solution
Implement comprehensive lifecycle management:
1. Scheduled start/stop for non-production resources
2. Orphan resource detection and cleanup
3. Rightsizing recommendations
4. Tagging intelligence for cost allocation

## Requirements

### Functional Requirements

#### Scheduling
- [ ] Create schedules for EC2 start/stop
- [ ] Support cron expressions for flexibility
- [ ] Pause/resume schedules
- [ ] Edit existing schedules
- [ ] View schedule execution history

#### Orphan Detection
- [ ] Detect unattached EBS volumes
- [ ] Find unused Elastic IPs
- [ ] Identify idle load balancers
- [ ] Detect orphaned snapshots
- [ ] Network interface detection

#### Rightsizing
- [ ] Analyze CPU/memory utilization
- [ ] Recommend instance type changes
- [ ] Calculate potential savings
- [ ] Show performance impact

#### Tagging Intelligence
- [ ] Suggest tags based on patterns
- [ ] Detect untagged resources
- [ ] Tag compliance scoring
- [ ] Auto-tag recommendations

### Non-Functional Requirements
- [ ] Schedule execution reliability > 99.9%
- [ ] Detection scan completes < 5 minutes
- [ ] Support for 1000+ resources
- [ ] Audit trail for all actions

## Technical Design

### Architecture
```
Backend Services
├── resourceLifecycleService.js
│   ├── createSchedule()
│   ├── executeSchedule()
│   ├── pauseSchedule()
│   └── getScheduleHistory()
├── orphanDetectionService.js
│   ├── detectOrphanedVolumes()
│   ├── detectUnusedEIPs()
│   ├── detectIdleResources()
│   └── syncOrphanedResources()
├── rightsizingService.js
│   └── getRecommendations()
└── taggingIntelligenceService.js
    ├── suggestTags()
    └── getComplianceScore()

Frontend Components
├── ResourceLifecycleManagement.tsx
│   ├── Schedule List
│   ├── Create Schedule Dialog
│   ├── Orphan Resources Tab
│   └── Rightsizing Tab
└── TaggingIntelligence.tsx
```

### Database Schema
```sql
CREATE TABLE lifecycle_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  resource_type VARCHAR(50),
  resource_ids TEXT[],
  action VARCHAR(20),
  cron_expression VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE schedule_executions (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES lifecycle_schedules(id),
  executed_at TIMESTAMP,
  status VARCHAR(20),
  result JSONB
);
```

## Implementation Tasks

### Task 1: Scheduling Engine
- Implement cron parser
- Create schedule executor
- Add pause/resume logic
- Build execution history

### Task 2: Orphan Detection
- Query AWS for unattached volumes
- Check EIP associations
- Analyze load balancer targets
- Scan for orphaned snapshots

### Task 3: Rightsizing Analysis
- Fetch CloudWatch metrics
- Compare against instance specs
- Calculate savings potential
- Generate recommendations

### Task 4: Tagging Intelligence
- Analyze existing tag patterns
- Build suggestion engine
- Calculate compliance scores
- Create auto-tag rules

## Savings Potential

| Resource Type | Typical Waste | Savings |
|--------------|---------------|---------|
| Dev/Test EC2 | 70% idle time | 50-70% |
| Orphan EBS | 100% unused | 100% |
| Unused EIPs | $3.60/month each | 100% |
| Oversized instances | 40% over-provisioned | 30-50% |

## Success Metrics
- Resources under management > 500
- Schedule execution success rate > 99%
- Orphan cleanup rate > 80%
- Cost savings realized > $1000/month
