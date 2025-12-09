/**
 * Demo Script: Populate Rightsizing Recommendations
 * Creates sample recommendations for demo purposes
 */

const DatabaseService = require('./backend/src/services/databaseService');
require('dotenv').config({ path: './backend/.env' });

const userId = 1763658402716;

const sampleRecommendations = [
    {
        resource_id: 'i-01d810f33807eb617',
        current_instance_type: 't3.large',
        recommended_instance_type: 't3.medium',
        current_cost: 60.74,
        estimated_cost: 30.37,
        potential_savings: 30.37,
        confidence_score: 0.92,
        reason: 'CPU utilization averaging 18% over 30 days. Memory at 35%. Significant cost savings with minimal performance impact.',
        user_id: userId,
        status: 'pending'
    },
    {
        resource_id: 'i-0233383d0629a29d71',
        current_instance_type: 't3.xlarge',
        recommended_instance_type: 't3.large',
        current_cost: 121.48,
        estimated_cost: 60.74,
        potential_savings: 60.74,
        confidence_score: 0.88,
        reason: 'Low resource utilization detected. CPU avg 22%, Memory avg 40%. Downsize recommended.',
        user_id: userId,
        status: 'pending'
    },
    {
        resource_id: 'i-05e62d5f084be3958',
        current_instance_type: 't2.medium',
        recommended_instance_type: 't3.small',
        current_cost: 33.87,
        estimated_cost: 15.18,
        potential_savings: 18.69,
        confidence_score: 0.85,
        reason: 'Upgrade to newer generation T3 with better performance-to-cost ratio. CPU usage stable at 25%.',
        user_id: userId,
        status: 'pending'
    }
];

async function populateRightsizingRecommendations() {
    console.log('🎬 Creating Rightsizing Demo Data\n');
    console.log('='.repeat(60));
    
    try {
        // Clear existing recommendations for this user
        console.log('\n1️⃣ Clearing old recommendations...');
        const deleted = await DatabaseService.query(
            'DELETE FROM rightsizing_recommendations WHERE user_id = $1 RETURNING id',
            [userId]
        );
        console.log(`✅ Cleared ${deleted.rows.length} old recommendations`);
        
        // Insert new recommendations
        console.log('\n2️⃣ Creating new recommendations...');
        let created = 0;
        
        for (const rec of sampleRecommendations) {
            await DatabaseService.query(`
                INSERT INTO rightsizing_recommendations 
                (resource_id, current_instance_type, recommended_instance_type, 
                 current_cost, estimated_cost, potential_savings, confidence_score, 
                 reason, user_id, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            `, [
                rec.resource_id,
                rec.current_instance_type,
                rec.recommended_instance_type,
                rec.current_cost,
                rec.estimated_cost,
                rec.potential_savings,
                rec.confidence_score,
                rec.reason,
                rec.user_id,
                rec.status
            ]);
            
            console.log(`✅ ${rec.resource_id}: ${rec.current_instance_type} → ${rec.recommended_instance_type} (Save $${rec.potential_savings.toFixed(2)}/mo)`);
            created++;
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ Demo data created successfully!`);
        console.log(`   - ${created} rightsizing recommendations`);
        console.log(`   - Total potential savings: $${sampleRecommendations.reduce((sum, r) => sum + r.potential_savings, 0).toFixed(2)}/month`);
        console.log(`\n💡 Go to Lifecycle Management → Rightsizing tab to see recommendations`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

populateRightsizingRecommendations();
