// test-weekly-costs.js (Updated)
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');

// Cost Explorer client - MUST be us-east-1 (but sees all regions)
const client = new CostExplorerClient({
    region: 'us-east-1'  // ← API endpoint location
});

async function getWeeklyCosts() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    console.log(`📊 Fetching 7-day costs: ${start} to ${end}`);
    console.log(`🌍 API Endpoint: us-east-1 (but shows ALL regions including ap-south-1)`);
    const params = {
        TimePeriod: { Start: start, End: end },
        Granularity: 'DAILY',
        Metrics: ['BlendedCost'],
        GroupBy: [
            { Type: 'DIMENSION', Key: 'SERVICE' },
            { Type: 'DIMENSION', Key: 'REGION' }  // ← Let's see which regions!
        ]
    };

    try {
        const response = await client.send(new GetCostAndUsageCommand(params));

        response.ResultsByTime.forEach(day => {
            console.log(`\n📅 ${day.TimePeriod.Start}:`);
            console.log(`   Total: $${day.Total.UnblendedCost.Amount}`);


            if (day.Groups && day.Groups.length > 0) {
                day.Groups.forEach(group => {
                    const [service, region] = group.Keys;
                    const cost = group.Metrics.UnblendedCost.Amount;
                    if (parseFloat(cost) > 0) {
                        console.log(`   ${service} (${region}): $${cost}`);
                    }
                });
            }
        });

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
}

getWeeklyCosts();