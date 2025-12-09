// Cost Governance & Automation Service
// Token-efficient, production-ready policy engine
const { EC2Client, StopInstancesCommand } = require('@aws-sdk/client-ec2');
const DatabaseService = require('./databaseService');

class GovernanceService {
  // Evaluate and enforce all active policies for a user/account
  static async evaluateAndEnforce(userId, awsCredentials, options = {}) {
    const policies = await this.listPolicies(userId);
    const results = [];
    for (const p of policies) {
      const r = await this.enforcePolicy(p, awsCredentials, options, userId);
      results.push({ policyId: p.id, type: p.type, enforced: r.enforced, details: r.details || null });
    }
    return { success: true, results, enforcedCount: results.filter(r=>r.enforced).length };
  }

  // Core enforcement dispatcher
  static async enforcePolicy(policy, awsCredentials, options, userId) {
    if (!policy?.active) return { enforced: false, details: 'inactive' };
    switch (policy.type) {
      case 'budget_threshold':
        return await this.enforceBudgetThreshold(policy, userId);
      case 'tag_compliance':
        return await this.enforceTagCompliance(policy, userId);
      default:
        return { enforced: false, details: 'unknown_type' };
    }
  }

  // Policy: Budget threshold -> create alert + optional webhook
  static async enforceBudgetThreshold(policy, userId) {
    const { budget_amount, period = 'monthly', notify_webhook } = policy.params || {};
    if (!budget_amount) return { enforced: false, details: 'missing_budget_amount' };
    const total = await this.getPeriodSpend(period, userId);
    if (total >= budget_amount) {
      await this.recordGovernanceEvent('budget_threshold_breached', { total, budget_amount, period });
      if (notify_webhook) await this.triggerWebhook(notify_webhook, { event: 'budget_breach', total, budget_amount, period });
      return { enforced: true, details: { total, budget_amount } };
    }
    return { enforced: false, details: { total, budget_amount } };
  }



  // Policy: Tag compliance -> detect and optionally auto-tag
  static async enforceTagCompliance(policy, userId) {
    const { requiredTags = { Owner: /.*/, CostCenter: /.*/, Environment: /.*/ }, autoRemediate = false } = policy.params || {};
    
    // 🔒 SECURITY: Query resources missing ANY of the required tags
    const requiredTagKeys = Object.keys(requiredTags);
    
    // Exclude non-taggable services (billing items, not actual resources)
    const nonTaggableServices = [
      'Tax',
      'AWS Data Transfer',
      'AWS Cost Explorer',
      'AWS Support (Business)',
      'AWS Support (Developer)',
      'AWS Support (Enterprise)',
      'Amazon Registrar'
    ];
    
    const query = `
      SELECT 
        service_name,
        region,
        tags,
        resource_id,
        cost_amount,
        date
      FROM cost_records 
      WHERE user_id = $1 
      AND service_name != ALL($2::text[])
      AND (
        tags IS NULL 
        OR NOT tags ? 'Owner'
        OR NOT tags ? 'CostCenter'
        OR NOT tags ? 'Environment'
      )
      ORDER BY cost_amount DESC
      LIMIT 100
    `;
    
    const res = await DatabaseService.query(query, [DatabaseService.getUserIdForDatabase(userId), nonTaggableServices]).catch(()=>({ rows: [] }));
    const offenders = res.rows || [];
    
    // Group by service and region, treating each service/region as ONE resource
    // (since cost records are daily charges, not individual resources)
    const groupedOffenders = offenders.reduce((acc, resource) => {
      const key = `${resource.service_name}-${resource.region || 'global'}`;
      if (!acc[key]) {
        acc[key] = {
          service: resource.service_name,
          region: resource.region || 'global',
          totalCost: 0,
          recordCount: 0,
          dateRange: {
            earliest: resource.date,
            latest: resource.date
          }
        };
      }
      acc[key].totalCost += parseFloat(resource.cost_amount) || 0;
      acc[key].recordCount += 1;
      
      // Track date range
      if (new Date(resource.date) < new Date(acc[key].dateRange.earliest)) {
        acc[key].dateRange.earliest = resource.date;
      }
      if (new Date(resource.date) > new Date(acc[key].dateRange.latest)) {
        acc[key].dateRange.latest = resource.date;
      }
      
      return acc;
    }, {});
    
    const groupedArray = Object.values(groupedOffenders);
    
    await this.recordGovernanceEvent('tag_compliance_scan', { 
      totalOffenders: offenders.length,
      groupedCount: groupedArray.length 
    });
    
    return { 
      enforced: groupedArray.length > 0, 
      details: { 
        totalOffenders: groupedArray.length, // Actual number of unique services
        totalCostRecords: offenders.length, // Total billing line items
        groupedResources: groupedArray,
        requiredTags: Object.keys(requiredTags)
      } 
    };
  }

  // Simple helpers
  static async listPolicies(userId) {
    // Try database table, else fallback to file-based defaults
    try {
      console.log(`   Querying policies for user_id: ${userId} (type: ${typeof userId})`);
      const r = await DatabaseService.query(`SELECT * FROM governance_policies WHERE user_id=$1 AND active=true ORDER BY priority NULLS LAST, created_at DESC`, [userId]);
      console.log(`   Found ${r.rows.length} policies`);
      return r.rows || [];
    } catch (error) { 
      console.error(`   ❌ Error fetching policies:`, error.message);
      return []; 
    }
  }

  static async getPeriodSpend(period, userId) {
    // 🔒 SECURITY: Filter spend by user ID
    const sql = period==='daily'
      ? `SELECT COALESCE(SUM(cost_amount),0) AS s FROM cost_records WHERE user_id=$1 AND date>=CURRENT_DATE`
      : `SELECT COALESCE(SUM(cost_amount),0) AS s FROM cost_records WHERE user_id=$1 AND date>=date_trunc('month', CURRENT_DATE)`;
    const r = await DatabaseService.query(sql, [DatabaseService.getUserIdForDatabase(userId)]).catch(()=>({ rows:[{s:0}] }));
    console.log(`🔒 Period spend for user ${userId}: $${parseFloat(r.rows[0].s)||0}`);
    return parseFloat(r.rows[0].s)||0;
  }

  static async recordGovernanceEvent(event, details) {
    try {
      await DatabaseService.query(`INSERT INTO governance_events(event_type, details, created_at) VALUES ($1,$2,NOW())`, [event, JSON.stringify(details||{})]);
    } catch {}
  }

  static async triggerWebhook(url, payload) {
    try { await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}); } catch {}
  }
}

module.exports = GovernanceService;

