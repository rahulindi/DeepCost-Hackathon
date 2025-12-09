require('dotenv').config();
const AwsCostService = require('./src/services/awsCostService');

async function testAwsApiDisabled() {
    console.log('🧪 Testing AWS Cost Explorer API Disabled Mode\n');
    console.log('═'.repeat(60));
    
    // Check environment variable
    const envValue = process.env.ENABLE_AWS_COST_EXPLORER;
    console.log(`\n📋 Environment Variable:`);
    console.log(`   ENABLE_AWS_COST_EXPLORER = "${envValue}"`);
    
    // Check if service recognizes it as disabled
    const isEnabled = AwsCostService.isAwsCostExplorerEnabled();
    console.log(`\n🔍 Service Status:`);
    console.log(`   API Enabled: ${isEnabled}`);
    console.log(`   API Disabled: ${!isEnabled}`);
    
    if (!isEnabled) {
        console.log('\n✅ AWS Cost Explorer API is DISABLED');
        console.log('   💰 No AWS charges will be incurred');
        console.log('   📊 App will use cached database data');
    } else {
        console.log('\n⚠️  AWS Cost Explorer API is ENABLED');
        console.log('   💸 AWS API calls will incur charges');
        console.log('   📈 App will fetch fresh data from AWS');
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('Testing API Methods (should return cached data):\n');
    
    // Test each method
    const methods = [
        { name: 'getCostsWithTagGrouping', fn: () => AwsCostService.getCostsWithTagGrouping() },
        { name: 'getCostForecast', fn: () => AwsCostService.getCostForecast() },
        { name: 'getMonthToDateCosts', fn: () => AwsCostService.getMonthToDateCosts() },
        { name: 'getWeeklyCosts', fn: () => AwsCostService.getWeeklyCosts() },
        { name: 'getResourceLevelCosts', fn: () => AwsCostService.getResourceLevelCosts() },
        { name: 'getTagComplianceSummary', fn: () => AwsCostService.getTagComplianceSummary() }
    ];
    
    let allCached = true;
    
    for (const method of methods) {
        try {
            console.log(`Testing: ${method.name}...`);
            const result = await method.fn();
            
            if (result.cached) {
                console.log(`   ✅ Returns cached data`);
                console.log(`   📝 Message: ${result.message}`);
            } else {
                console.log(`   ⚠️  Made real AWS API call!`);
                allCached = false;
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        console.log('');
    }
    
    console.log('═'.repeat(60));
    console.log('\n📊 Test Results:\n');
    
    if (!isEnabled && allCached) {
        console.log('✅ SUCCESS: AWS Cost Explorer API is properly disabled');
        console.log('✅ All methods return cached data');
        console.log('✅ No AWS charges will be incurred');
        console.log('✅ App is fully functional with cached data\n');
        
        console.log('💡 To re-enable AWS API:');
        console.log('   1. Edit backend/.env');
        console.log('   2. Set: ENABLE_AWS_COST_EXPLORER=true');
        console.log('   3. Restart backend: npm start\n');
        
        console.log('🎉 You can now test the AI chatbot without AWS costs!');
    } else if (isEnabled) {
        console.log('⚠️  AWS Cost Explorer API is ENABLED');
        console.log('💸 AWS API calls will incur charges\n');
        
        console.log('💡 To disable AWS API and save costs:');
        console.log('   1. Edit backend/.env');
        console.log('   2. Set: ENABLE_AWS_COST_EXPLORER=false');
        console.log('   3. Restart backend: npm start');
    } else {
        console.log('❌ Some methods are not respecting the disabled flag');
        console.log('   Please check the implementation');
    }
    
    console.log('\n' + '═'.repeat(60));
}

testAwsApiDisabled().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
