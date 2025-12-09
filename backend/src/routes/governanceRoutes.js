// Cost Governance API Routes
const express = require('express');
const router = express.Router();
const GovernanceService = require('../services/governanceService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * Helper function to convert user ID for database compatibility
 */
const convertUserId = (userId) => {
  if (typeof userId === 'string' && userId.startsWith('user-')) {
    return parseInt(userId.substring(5), 10);
  }
  return userId;
};

// Evaluate and enforce all policies
router.post('/enforce', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    console.log(`🔍 Enforcing governance policies for user: ${userId} (DB ID: ${dbUserId})`);
    
    // Try to get AWS credentials, but don't fail if not available
    // Only schedule_shutdown policy requires AWS credentials
    const SimpleAwsCredentials = require('../services/simpleAwsCredentials');
    const creds = SimpleAwsCredentials.get(dbUserId);
    
    let awsCredentials = null;
    if (creds.success) {
      console.log(`✅ AWS credentials loaded for user ${dbUserId}`);
      awsCredentials = creds.credentials;
    } else {
      console.log(`⚠️  No AWS credentials found for user ${dbUserId} - schedule_shutdown policies will be skipped`);
    }
    
    const result = await GovernanceService.evaluateAndEnforce(dbUserId, awsCredentials, req.body);
    res.json(result);
  } catch (error) {
    console.error('Governance enforcement error:', error);
    res.status(500).json({ error: 'Governance enforcement failed', details: error.message });
  }
});

// List user policies
router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    console.log(`📋 Getting governance policies for user: ${userId} (DB ID: ${dbUserId})`);
    
    const policies = await GovernanceService.listPolicies(dbUserId);
    res.json({ success: true, policies });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Failed to fetch policies', details: error.message });
  }
});

// Create policy
router.post('/policies', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    const { type, name, params, active = true, priority } = req.body;
    
    console.log(`📝 Creating governance policy for user: ${userId} (DB ID: ${dbUserId})`);
    
    if (!type || !name) return res.status(400).json({ error: 'Type and name required' });
    
    const DatabaseService = require('../services/databaseService');
    const query = `INSERT INTO governance_policies(user_id, type, name, params, active, priority, created_at) 
                   VALUES($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`;
    const result = await DatabaseService.query(query, 
      [dbUserId, type, name, JSON.stringify(params||{}), active, priority]);
    
    console.log(`✅ Policy created with ID: ${result.rows[0].id}`);
    res.json({ success: true, policyId: result.rows[0].id });
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({ error: 'Failed to create policy', details: error.message });
  }
});

// Update policy
router.put('/policies/:policyId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    const { policyId } = req.params;
    const { name, params, active, priority } = req.body;
    
    console.log(`✏️  Updating policy ${policyId} for user: ${userId}`);
    
    const DatabaseService = require('../services/databaseService');
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (params !== undefined) {
      updates.push(`params = $${paramCount++}`);
      values.push(JSON.stringify(params));
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(active);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(policyId, dbUserId);
    const query = `UPDATE governance_policies SET ${updates.join(', ')} 
                   WHERE id = $${paramCount++} AND user_id = $${paramCount++} RETURNING *`;
    
    const result = await DatabaseService.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found or unauthorized' });
    }
    
    console.log(`✅ Policy ${policyId} updated`);
    res.json({ success: true, policy: result.rows[0] });
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Failed to update policy', details: error.message });
  }
});

// Delete policy
router.delete('/policies/:policyId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    const { policyId } = req.params;
    
    console.log(`🗑️  Deleting policy ${policyId} for user: ${userId}`);
    
    const DatabaseService = require('../services/databaseService');
    const result = await DatabaseService.query(
      'DELETE FROM governance_policies WHERE id = $1 AND user_id = $2 RETURNING id',
      [policyId, dbUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found or unauthorized' });
    }
    
    console.log(`✅ Policy ${policyId} deleted`);
    res.json({ success: true, message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Delete policy error:', error);
    res.status(500).json({ error: 'Failed to delete policy', details: error.message });
  }
});

// Toggle policy active status
router.patch('/policies/:policyId/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbUserId = convertUserId(userId);
    const { policyId } = req.params;
    
    const DatabaseService = require('../services/databaseService');
    const result = await DatabaseService.query(
      `UPDATE governance_policies 
       SET active = NOT active 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, active`,
      [policyId, dbUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found or unauthorized' });
    }
    
    console.log(`✅ Policy ${policyId} toggled to ${result.rows[0].active ? 'active' : 'inactive'}`);
    res.json({ success: true, active: result.rows[0].active });
  } catch (error) {
    console.error('Toggle policy error:', error);
    res.status(500).json({ error: 'Failed to toggle policy', details: error.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'compliance-governance',
    features: ['budget_threshold', 'tag_compliance'],
    note: 'Resource scheduling available in Resource Lifecycle Management',
    endpoints: ['/api/governance/enforce', '/api/governance/policies'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
