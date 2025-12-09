// Migration: Add Rightsizing Demo Data

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DatabaseService = require('../services/databaseService');

const userId = 1763658402716;

const sampleRecommendations = [
    {
        resource_id: 'i-01d810f33807eb617',
        current_instance_type: 't3.large',
        recommended_instance_type: 't3.medium',
        current_cost: 60.74,
        estimated_cost: 30.37,
        potential_savings: 30.37,
        confidence_score: 92,
        reason: 'CPU utilization averaging 18% over 30 days. Memory at 35%. Significant cost savings with minimal performance impact.'
    },
    {
        resource_id: 'i-0233383d0629a29d71',
        current_instance_type: 't3.xlarge',
        recommended_instance_type: 't3.large',
        current_cost: 121.48,
        estimated_cost: 60.74,
        potential_savings: 60.74,
        confidence_score: 88,
        reason: 'Low resource utilization detected. CPU avg 22%, Memory avg 40%. Downsize recommended.'
    },
    {
        resource_id: 'i-05e62d5f084be3958',
        current_instance_type: 't2.medium',
        recommended_instance_type: 't3.small',
        current_cost: 33.87,
        estimated_cost: 15.18,
        potential_savings: 18.69,
        confidence_score: 85,
        reason: 'Upgrade to newer generation T3 with better performance-to-cost ratio. CPU usage stable at 25%.'
    }
];

async function addRightsizingDemoData() {
    console.log('🎬 Adding Rightsizing Demo Data...');

    try {
        // Clear existing
        const deleted = await DatabaseService.query(
            'DELETE FROM rightsizing_recommendations WHERE user_id = $1 RETURNING id',
            [userId]
        );
        console.log(`✅ Cleared ${deleted.rows.length} old recommendations`);
        
        // Insert new
        let created = 0;
        for (const rec of sampleRecommendations) {
            await DatabaseService.query(`
                INSERT INTO rightsizing_recommendations 
                (resource_id, current_instance_type, recommended_instance_type, confidence_score, 
                 potential_savings, performance_impact, analysis_data, user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                rec.resource_id, rec.current_instance_type, rec.recommended_instance_type,
                rec.confidence_score, rec.potential_savings, 'low',
                JSON.stringify({reason: rec.reason, cpu: '18%', memory: '35%'}),
                userId
            ]);
            created++;
        }
        
        console.log(`✅ Created ${created} rightsizing recommendations`);
        console.log(`💰 Total potential savings: $${sampleRecommendations.reduce((sum, r) => sum + r.potential_savings, 0).toFixed(2)}/month`);
        return { success: true };

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

if (require.main === module) {
    addRightsizingDemoData()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addRightsizingDemoData;
