// Granular Resource Tagging Intelligence Service
// Enterprise-grade automated tagging with ML-powered suggestions
const DatabaseService = require('./databaseService');

class TaggingIntelligenceService {
  // Analyze existing tags and generate intelligent suggestions
  static async analyzeTaggingPatterns(userId) {
    try {
      // 🔒 SECURITY: Filter by user_id to prevent data leaks
      const query = `
        SELECT service_name, region, tags, cost_amount, date 
        FROM cost_records 
        WHERE user_id = $1 
          AND tags IS NOT NULL 
          AND jsonb_typeof(tags) = 'object'
        ORDER BY date DESC LIMIT 1000
      `;
      const result = await DatabaseService.query(query, [DatabaseService.getUserIdForDatabase(userId)]);
      const resources = result.rows || [];
      
      // If no tagged resources, return helpful empty state
      if (resources.length === 0) {
        return {
          success: true,
          analysis: {
            totalTaggedResources: 0,
            commonTags: [],
            tagPatterns: { serviceSpecific: {}, regionSpecific: {}, valuePatterns: {} },
            suggestions: [
              {
                type: 'getting_started',
                tag: 'Owner',
                reason: 'No tags found. Start by adding Owner tags to track resource ownership',
                priority: 'high',
                action: 'click_auto_tag_button'
              },
              {
                type: 'getting_started',
                tag: 'Environment',
                reason: 'Add Environment tags (prod, dev, staging) to categorize resources',
                priority: 'high',
                action: 'click_auto_tag_button'
              },
              {
                type: 'getting_started',
                tag: 'CostCenter',
                reason: 'Add CostCenter tags to allocate costs to departments',
                priority: 'high',
                action: 'click_auto_tag_button'
              }
            ],
            complianceScore: {
              overall: 0,
              breakdown: { requiredTags: 0, coverage: 0, consistency: 0 },
              recommendations: [
                'No tags found in your resources.',
                'Click the AUTO-TAG button to add default tags.',
                'This will improve cost allocation and compliance tracking.'
              ]
            },
            lastAnalyzed: new Date().toISOString()
          }
        };
      }
      
      const patterns = this.extractTagPatterns(resources);
      const suggestions = this.generateSuggestions(patterns);
      
      return {
        success: true,
        analysis: {
          totalTaggedResources: resources.length,
          commonTags: patterns.commonTags,
          tagPatterns: patterns.patterns,
          suggestions: suggestions,
          complianceScore: this.calculateComplianceScore(patterns),
          lastAnalyzed: new Date().toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Extract intelligent patterns from existing tags
  static extractTagPatterns(resources) {
    const tagFrequency = new Map();
    const serviceTagMap = new Map();
    const regionTagMap = new Map();
    const valuePatterns = new Map();
    
    resources.forEach(resource => {
      const tags = resource.tags || {};
      const service = resource.service_name;
      const region = resource.region;
      
      Object.entries(tags).forEach(([key, value]) => {
        // Tag frequency analysis
        tagFrequency.set(key, (tagFrequency.get(key) || 0) + 1);
        
        // Service-specific tag patterns
        if (!serviceTagMap.has(service)) serviceTagMap.set(service, new Set());
        serviceTagMap.get(service).add(key);
        
        // Region-specific tag patterns
        if (!regionTagMap.has(region)) regionTagMap.set(region, new Set());
        regionTagMap.get(region).add(key);
        
        // Value pattern analysis
        if (!valuePatterns.has(key)) valuePatterns.set(key, new Set());
        valuePatterns.get(key).add(value);
      });
    });
    
    return {
      commonTags: Array.from(tagFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([key, count]) => ({ key, frequency: count, usage: (count / resources.length * 100).toFixed(1) + '%' })),
      
      patterns: {
        serviceSpecific: this.convertMapToObject(serviceTagMap),
        regionSpecific: this.convertMapToObject(regionTagMap),
        valuePatterns: this.convertMapToObject(valuePatterns)
      }
    };
  }

  // Generate intelligent tag suggestions based on patterns
  static generateSuggestions(patterns) {
    const suggestions = [];
    
    // Suggest missing common tags
    const commonTagThreshold = 0.3; // 30% usage threshold
    patterns.commonTags.forEach(tag => {
      if (parseFloat(tag.usage) < commonTagThreshold * 100) {
        suggestions.push({
          type: 'missing_common_tag',
          tag: tag.key,
          reason: `Only ${tag.usage} of resources have this common tag`,
          priority: 'high',
          action: 'apply_to_untagged_resources'
        });
      }
    });
    
    // Standard enterprise tag suggestions
    const enterpriseTags = ['Owner', 'CostCenter', 'Environment', 'Project', 'Department', 'BusinessUnit'];
    enterpriseTags.forEach(tag => {
      const exists = patterns.commonTags.find(t => t.key.toLowerCase() === tag.toLowerCase());
      if (!exists) {
        suggestions.push({
          type: 'missing_enterprise_tag',
          tag: tag,
          reason: 'Standard enterprise tag not found in resources',
          priority: 'medium',
          action: 'implement_enterprise_standard'
        });
      }
    });
    
    // Naming convention suggestions
    const inconsistentKeys = this.findInconsistentTagKeys(patterns.commonTags);
    inconsistentKeys.forEach(suggestion => {
      suggestions.push({
        type: 'naming_convention',
        ...suggestion,
        priority: 'low'
      });
    });
    
    return suggestions.slice(0, 15); // Top 15 suggestions
  }

  // Calculate tagging compliance score
  static calculateComplianceScore(patterns) {
    const requiredTags = ['Owner', 'CostCenter', 'Environment', 'Project'];
    const commonTags = patterns.commonTags.map(t => t.key.toLowerCase());
    
    let score = 0;
    let maxScore = 100;
    
    // Required tags scoring (60% of total score)
    const requiredScore = requiredTags.filter(tag => 
      commonTags.includes(tag.toLowerCase())
    ).length / requiredTags.length * 60;
    score += requiredScore;
    
    // Tag coverage scoring (25% of total score)
    const avgTagUsage = patterns.commonTags.length > 0 
      ? patterns.commonTags.reduce((sum, tag) => sum + parseFloat(tag.usage), 0) / patterns.commonTags.length
      : 0;
    const coverageScore = Math.min(avgTagUsage / 80 * 25, 25); // 80% usage target
    score += coverageScore;
    
    // Consistency scoring (15% of total score)
    const consistencyScore = Math.max(0, 15 - (this.findInconsistentTagKeys(patterns.commonTags).length * 3));
    score += consistencyScore;
    
    return {
      overall: Math.round(score),
      breakdown: {
        requiredTags: Math.round(requiredScore),
        coverage: Math.round(coverageScore),
        consistency: Math.round(consistencyScore)
      },
      recommendations: this.getScoreRecommendations(Math.round(score))
    };
  }

  // Find inconsistent tag naming (CamelCase vs snake_case, etc.)
  static findInconsistentTagKeys(commonTags) {
    const suggestions = [];
    const keys = commonTags.map(t => t.key);
    
    // Check for case inconsistencies
    const caseVariants = new Map();
    keys.forEach(key => {
      const normalized = key.toLowerCase();
      if (!caseVariants.has(normalized)) {
        caseVariants.set(normalized, []);
      }
      caseVariants.get(normalized).push(key);
    });
    
    caseVariants.forEach((variants, normalized) => {
      if (variants.length > 1) {
        suggestions.push({
          tag: variants.join(', '),
          reason: `Inconsistent casing: ${variants.join(', ')}`,
          action: 'standardize_case_format'
        });
      }
    });
    
    return suggestions;
  }

  // Auto-apply intelligent tags to untagged resources
  static async autoTagResources(userId, tagRules) {
    try {
      const appliedTags = [];
      const dbUserId = DatabaseService.getUserIdForDatabase(userId);
      
      console.log(`🏷️  Auto-tagging for user ${userId} (DB ID: ${dbUserId})`);
      console.log(`   Rules to apply: ${tagRules.length}`);
      
      for (const rule of tagRules) {
        const { service, region, tagKey, tagValue } = rule;
        
        // 🔒 SECURITY: Build dynamic query with user_id filtering
        let whereClause = 'WHERE user_id = $4 AND (tags IS NULL OR NOT tags ? $3)';
        const params = [tagKey, tagValue, tagKey, dbUserId];
        
        if (service) {
          whereClause += ' AND service_name = $' + (params.length + 1);
          params.push(service);
        }
        
        if (region) {
          whereClause += ' AND region = $' + (params.length + 1);
          params.push(region);
        }
        
        const updateQuery = `
          UPDATE cost_records 
          SET tags = COALESCE(tags, '{}'::jsonb) || jsonb_build_object($1::text, $2::text)
          ${whereClause}
          RETURNING id, service_name, region
        `;
        
        console.log(`   Applying tag: ${tagKey} = ${tagValue}`);
        console.log(`   Query: ${updateQuery}`);
        console.log(`   Params:`, params);
        
        const result = await DatabaseService.query(updateQuery, params);
        
        console.log(`   ✅ Tagged ${result.rowCount} resources`);
        
        appliedTags.push({
          rule: rule,
          resourcesTagged: result.rowCount,
          resources: result.rows.slice(0, 10) // Sample of tagged resources
        });
      }
      
      const total = appliedTags.reduce((sum, at) => sum + at.resourcesTagged, 0);
      console.log(`✅ Auto-tag complete: ${total} total resources tagged`);
      
      return { success: true, appliedTags, totalResourcesTagged: total };
    } catch (error) {
      console.error('❌ Auto-tag error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get tag compliance report
  static async getComplianceReport(userId) {
    try {
      // 🔒 SECURITY: Filter by user_id to prevent data leaks
      const query = `
        SELECT 
          service_name,
          region,
          COUNT(*) as total_resources,
          COUNT(CASE WHEN tags IS NOT NULL AND jsonb_typeof(tags) = 'object' THEN 1 END) as tagged_resources,
          COUNT(CASE WHEN tags ? 'Owner' THEN 1 END) as owner_tagged,
          COUNT(CASE WHEN tags ? 'CostCenter' THEN 1 END) as costcenter_tagged,
          COUNT(CASE WHEN tags ? 'Environment' THEN 1 END) as environment_tagged
        FROM cost_records 
        WHERE user_id = $1 
          AND date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY service_name, region
        ORDER BY total_resources DESC
      `;
      
      const result = await DatabaseService.query(query, [DatabaseService.getUserIdForDatabase(userId)]);
      const compliance = result.rows.map(row => ({
        service: row.service_name,
        region: row.region,
        totalResources: parseInt(row.total_resources),
        taggedResources: parseInt(row.tagged_resources),
        complianceRate: ((parseInt(row.tagged_resources) / parseInt(row.total_resources)) * 100).toFixed(1) + '%',
        tagBreakdown: {
          Owner: parseInt(row.owner_tagged),
          CostCenter: parseInt(row.costcenter_tagged),
          Environment: parseInt(row.environment_tagged)
        }
      }));
      
      return { success: true, compliance, generatedAt: new Date().toISOString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  static convertMapToObject(map) {
    const obj = {};
    map.forEach((value, key) => {
      obj[key] = Array.isArray(value) ? value : Array.from(value);
    });
    return obj;
  }

  static getScoreRecommendations(score) {
    if (score >= 90) return ['Excellent tagging compliance! Consider automating tag inheritance.'];
    if (score >= 70) return ['Good tagging practices. Focus on consistency and coverage.', 'Implement missing enterprise tags.'];
    if (score >= 50) return ['Moderate compliance. Prioritize Owner and CostCenter tags.', 'Create tagging policies for new resources.'];
    return ['Poor tagging compliance. Implement comprehensive tagging strategy.', 'Start with critical tags: Owner, CostCenter, Environment.', 'Consider automated tagging rules.'];
  }
}

module.exports = TaggingIntelligenceService;
