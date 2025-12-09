require('dotenv').config();
const { Pool } = require('pg');

// Add debug logging to verify environment variables
console.log('🔍 Database Config:');
console.log('- DB_HOST:', process.env.DB_HOST);
console.log('- DB_NAME:', process.env.DB_NAME);
console.log('- DB_USER:', process.env.DB_USER);
console.log('- DB_PORT:', process.env.DB_PORT);

// Initialize pool with error handling
let pool;
let connectionTestPromise;

try {
    pool = new Pool({
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000, // 10 seconds
        idleTimeoutMillis: 30000,       // 30 seconds
        max: 20,                        // Maximum number of clients
        min: 2,                         // Minimum number of clients
        acquireTimeoutMillis: 10000     // Acquire timeout
    });

    // Test the connection with timeout and better error handling
    connectionTestPromise = Promise.race([
        pool.query('SELECT NOW() as current_time, COUNT(*) as record_count FROM cost_records'),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 15000)
        )
    ])
    .then((result) => {
        console.log('✅ Database connection successful');
        console.log('📊 Connected to AWS PostgreSQL with', result.rows[0].record_count, 'cost records');
        return true;
    })
    .catch(err => {
        console.warn('⚠️ Database connection failed, will use file-based storage:', err.message);
        if (pool) {
            pool.end().catch(() => {}); // Gracefully close pool
        }
        pool = null;
        return false;
    });
} catch (error) {
    console.warn('⚠️ Database pool initialization failed, will use file-based storage:', error.message);
    pool = null;
    connectionTestPromise = Promise.resolve(false);
}

class DatabaseService {
    // Generic query method for enterprise features
    static async query(queryText, values = []) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null;
        }

        if (!pool) {
            throw new Error('Database not available');
        }

        try {
            const result = await pool.query(queryText, values);
            return result;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
    }

    // Generic method to get user by email
    static async getUserByEmail(email) {
        try {
            const result = await this.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting user by email:', error);
            return null;
        }
    }

    // Generic method to get user by ID
    static async getUserById(id) {
        try {
            const result = await this.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting user by ID:', error);
            return null;
        }
    }

    // Generic method to update user
    static async updateUser(userId, updates) {
        try {
            const setClause = Object.keys(updates)
                .map((key, index) => `${key} = $${index + 2}`)
                .join(', ');
            
            const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`;
            const values = [userId, ...Object.values(updates)];
            
            const result = await this.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error updating user:', error);
            return null;
        }
    }

    // Enhanced: Save cost record with resource-level data
    static async saveCostRecord(date, serviceName, costAmount, additionalData = {}) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, skip saving
        if (!pool) {
            console.log('⚠️ Database not available, skipping saveCostRecord');
            return null;
        }

        try {
            const query = `
                INSERT INTO cost_records (
                    date, service_name, cost_amount, region, resource_id, 
                    currency, cost_center, department, project, environment, 
                    team, business_unit, tags, user_id
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
                RETURNING id
            `;

            const values = [
                date,
                serviceName,
                costAmount,
                additionalData.region || null,
                additionalData.resource_id || null,
                additionalData.currency || 'USD',
                additionalData.cost_center || null,
                additionalData.department || null,
                additionalData.project || null,
                additionalData.environment || null,
                additionalData.team || null,
                additionalData.business_unit || null,
                additionalData.tags ? JSON.stringify(additionalData.tags) : null,
                additionalData.user_id ? this.getUserIdForDatabase(additionalData.user_id) : null // 🔒 Save user_id
            ];

            const result = await pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('❌ Database saveCostRecord error:', error);
            return null;
        }
    }

    // Helper function to convert string user ID to integer for database operations
    static getUserIdForDatabase(stringUserId) {
        // Extract the numeric part from string user ID (e.g., "user-1756710762444" -> 1756710762444)
        if (typeof stringUserId === 'string' && stringUserId.startsWith('user-')) {
            const numericPart = stringUserId.substring(5);
            if (!isNaN(numericPart)) {
                // Return the full numeric value since user_id is BIGINT in database
                return parseInt(numericPart, 10);
            }
        }
        // If it's already a number or can be converted to one, use it
        if (typeof stringUserId === 'number') {
            return stringUserId;
        }
        if (typeof stringUserId === 'string' && !isNaN(stringUserId)) {
            return parseInt(stringUserId, 10);
        }
        // Fallback: return a default user ID for database operations
        return 1;
    }

    // Helper function to convert integer user ID back to string format
    static getStringUserIdFromDatabase(numericUserId) {
        return `user-${numericUserId}`;
    }

    // NEW: Get cost records with filters for resource-level analysis
    static async getCostRecords(filters = {}) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty cost records');
            return [];
        }

        try {
            let query = `
                SELECT * FROM cost_records 
                WHERE 1=1
            `;
            const values = [];
            let paramCount = 1;

            // Add date range filter
            if (filters.startDate) {
                query += ` AND date >= $${paramCount}`;
                values.push(filters.startDate);
                paramCount++;
            }

            if (filters.endDate) {
                query += ` AND date <= $${paramCount}`;
                values.push(filters.endDate);
                paramCount++;
            }

            // Add service filter
            if (filters.serviceName) {
                query += ` AND service_name ILIKE $${paramCount}`;
                values.push(`%${filters.serviceName}%`);
                paramCount++;
            }

            // Add cost center filter
            if (filters.costCenter) {
                query += ` AND cost_center = $${paramCount}`;
                values.push(filters.costCenter);
                paramCount++;
            }

            // Add department filter
            if (filters.department) {
                query += ` AND department = $${paramCount}`;
                values.push(filters.department);
                paramCount++;
            }

            // 🔒 SECURITY: Add user ID filter (CRITICAL for data isolation)
            if (filters.userId) {
                query += ` AND user_id = $${paramCount}`;
                values.push(this.getUserIdForDatabase(filters.userId));
                paramCount++;
                console.log(`🔒 Filtering cost records by userId: ${filters.userId}`);
            }

            query += ` ORDER BY date DESC, cost_amount DESC`;

            // Add limit
            if (filters.limit) {
                query += ` LIMIT $${paramCount}`;
                values.push(filters.limit);
            }

            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getCostRecords error:', error);
            return [];
        }
    }

    // NEW: Save tag compliance data
    static async saveTagCompliance(complianceData) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, skip saving
        if (!pool) {
            console.log('⚠️ Database not available, skipping saveTagCompliance');
            return null;
        }

        try {
            const dbUserId = this.getUserIdForDatabase(complianceData.user_id);

            const query = `
                INSERT INTO tag_compliance (
                    resource_id, service_name, region, required_tags, 
                    actual_tags, compliance_status, compliance_score, user_id
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                ON CONFLICT (resource_id) DO UPDATE SET
                    actual_tags = $5,
                    compliance_status = $6,
                    compliance_score = $7,
                    last_checked = CURRENT_TIMESTAMP
                RETURNING id
            `;

            const values = [
                complianceData.resource_id,
                complianceData.service_name,
                complianceData.region,
                JSON.stringify(complianceData.required_tags),
                JSON.stringify(complianceData.actual_tags),
                complianceData.compliance_status,
                complianceData.compliance_score,
                dbUserId
            ];

            const result = await pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('❌ Database saveTagCompliance error:', error);
            return null;
        }
    }

    // NEW: Get tag compliance summary
    static async getTagComplianceSummary(userId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty tag compliance summary');
            return [];
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            const query = `
                SELECT 
                    compliance_status,
                    COUNT(*) as count,
                    AVG(compliance_score) as avg_score
                FROM tag_compliance 
                WHERE user_id = $1 
                GROUP BY compliance_status
            `;

            const result = await pool.query(query, [dbUserId]);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getTagComplianceSummary error:', error);
            return [];
        }
    }

    // NEW: Save cost allocation rule
    static async saveCostAllocationRule(ruleData) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, skip saving
        if (!pool) {
            console.log('⚠️ Database not available, skipping saveCostAllocationRule');
            return null;
        }

        try {
            const dbUserId = this.getUserIdForDatabase(ruleData.user_id);

            const query = `
                INSERT INTO cost_allocation_rules (
                    rule_name, rule_type, condition_json, allocation_target, 
                    priority, is_active, user_id
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) 
                RETURNING id
            `;

            const values = [
                ruleData.rule_name,
                ruleData.rule_type,
                JSON.stringify(ruleData.condition_json),
                JSON.stringify(ruleData.allocation_target),
                ruleData.priority || 100,
                ruleData.is_active !== false, // Default to true
                dbUserId
            ];

            const result = await pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('❌ Database saveCostAllocationRule error:', error);
            return null;
        }
    }

    // NEW: Get cost allocation rules
    static async getCostAllocationRules(userId, activeOnly = true) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty allocation rules');
            return [];
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            let query = `
                SELECT * FROM cost_allocation_rules 
                WHERE user_id = $1
            `;

            if (activeOnly) {
                query += ` AND is_active = true`;
            }

            query += ` ORDER BY priority ASC, created_at DESC`;

            const result = await pool.query(query, [dbUserId]);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getCostAllocationRules error:', error);
            return [];
        }
    }

    // NEW: Save chargeback report
    static async saveChargebackReport(reportData) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, skip saving
        if (!pool) {
            console.log('⚠️ Database not available, skipping saveChargebackReport');
            return null;
        }

        try {
            const dbUserId = this.getUserIdForDatabase(reportData.user_id);

            const query = `
                INSERT INTO chargeback_reports (
                    report_period, report_date, cost_center, department, 
                    project, team, business_unit, total_cost, 
                    service_breakdown, resource_breakdown, tag_breakdown, user_id
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                RETURNING id
            `;

            const values = [
                reportData.report_period,
                reportData.report_date,
                reportData.cost_center,
                reportData.department,
                reportData.project,
                reportData.team,
                reportData.business_unit,
                reportData.total_cost,
                JSON.stringify(reportData.service_breakdown),
                JSON.stringify(reportData.resource_breakdown),
                JSON.stringify(reportData.tag_breakdown),
                dbUserId
            ];

            const result = await pool.query(query, values);
            return result.rows[0].id;
        } catch (error) {
            console.error('❌ Database saveChargebackReport error:', error);
            return null;
        }
    }

    // NEW: Get chargeback reports
    static async getChargebackReports(userId, period = null, limit = 10) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty chargeback reports');
            return [];
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            let query = `
                SELECT * FROM chargeback_reports 
                WHERE user_id = $1
            `;
            const values = [dbUserId];
            let paramCount = 2;

            if (period) {
                query += ` AND report_period = $${paramCount}`;
                values.push(period);
                paramCount++;
            }

            query += ` ORDER BY report_date DESC`;

            if (limit) {
                query += ` LIMIT $${paramCount}`;
                values.push(limit);
            }

            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getChargebackReports error:', error);
            return [];
        }
    }

    // NEW: Get cost breakdown by allocation
    static async getCostBreakdownByAllocation(userId, startDate, endDate) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty cost breakdown');
            return [];
        }

        try {
            const query = `
                SELECT 
                    cost_center,
                    department,
                    project,
                    environment,
                    team,
                    business_unit,
                    SUM(cost_amount) as total_cost,
                    COUNT(*) as record_count,
                    array_agg(DISTINCT service_name) as services
                FROM cost_records 
                WHERE date >= $1 AND date <= $2
                GROUP BY cost_center, department, project, environment, team, business_unit
                ORDER BY total_cost DESC
            `;

            const result = await pool.query(query, [startDate, endDate]);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getCostBreakdownByAllocation error:', error);
            return [];
        }
    }

    // NEW: Get top cost centers
    static async getTopCostCenters(userId, limit = 10) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty top cost centers');
            return [];
        }

        try {
            const query = `
                SELECT 
                    cost_center,
                    SUM(cost_amount) as total_cost,
                    COUNT(*) as resource_count,
                    COUNT(DISTINCT service_name) as service_count
                FROM cost_records 
                WHERE cost_center IS NOT NULL AND cost_center != 'unassigned'
                AND date >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY cost_center
                ORDER BY total_cost DESC
                LIMIT $1
            `;

            const result = await pool.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getTopCostCenters error:', error);
            return [];
        }
    }

    static async getDailySummary(date) {
        const query = `SELECT * FROM daily_summaries WHERE date = $1`;
        const result = await pool.query(query, [date]);
        return result.rows[0];
    }

    static async saveMonthlyTrend(monthYear, totalCost, serviceBreakdown) {
        const query = `
            INSERT INTO monthly_trends (month_year, total_cost, service_breakdown) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (month_year) DO UPDATE SET 
            total_cost = $2, service_breakdown = $3
            RETURNING id
        `;
        const result = await pool.query(query, [monthYear, totalCost, JSON.stringify(serviceBreakdown)]);
        return result.rows[0].id;
    }

    static async getMonthlyTrends(months = 6, userId = null) {
        try {
            // 🔒 SECURITY: Filter by user ID if provided
            let query, params;
            if (userId) {
                const dbUserId = this.getUserIdForDatabase(userId);
                console.log(`🔒 Filtering monthly trends by userId: ${dbUserId}`);
                query = `
                    SELECT 
                        TO_CHAR(date, 'YYYY-MM') as month_year,
                        SUM(cost_amount) as total_cost,
                        COUNT(*) as record_count,
                        LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM')) as prev_cost,
                        CASE 
                            WHEN LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM')) > 0 
                            THEN ROUND(((SUM(cost_amount) - LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM'))) / LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM'))) * 100, 2)
                            ELSE 0
                        END as growth_rate
                    FROM cost_records 
                    WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 month' * $2
                    GROUP BY TO_CHAR(date, 'YYYY-MM')
                    ORDER BY month_year DESC
                    LIMIT $2
                `;
                params = [dbUserId, months];
            } else {
                query = `
                    SELECT 
                        TO_CHAR(date, 'YYYY-MM') as month_year,
                        SUM(cost_amount) as total_cost,
                        COUNT(*) as record_count,
                        LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM')) as prev_cost,
                        CASE 
                            WHEN LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM')) > 0 
                            THEN ROUND(((SUM(cost_amount) - LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM'))) / LAG(SUM(cost_amount)) OVER (ORDER BY TO_CHAR(date, 'YYYY-MM'))) * 100, 2)
                            ELSE 0
                        END as growth_rate
                    FROM cost_records 
                    WHERE date >= CURRENT_DATE - INTERVAL '1 month' * $1
                    GROUP BY TO_CHAR(date, 'YYYY-MM')
                    ORDER BY month_year DESC
                    LIMIT $1
                `;
                params = [months];
            }

            const result = await this.query(query, params);
            
            // 🆕 Add service breakdown for each month
            for (const row of result.rows) {
                const serviceBreakdown = await this.getServiceBreakdownForMonth(row.month_year, userId);
                row.service_breakdown = serviceBreakdown;
            }
            
            return result.rows;
        } catch (error) {
            console.error('❌ Database getMonthlyTrends error:', error);
            return [];
        }
    }

    // 🆕 Get service breakdown for a specific month
    static async getServiceBreakdownForMonth(monthYear, userId = null) {
        try {
            let query, params;
            if (userId) {
                const dbUserId = this.getUserIdForDatabase(userId);
                query = `
                    SELECT 
                        service_name,
                        SUM(cost_amount) as cost
                    FROM cost_records 
                    WHERE user_id = $1 
                    AND TO_CHAR(date, 'YYYY-MM') = $2
                    GROUP BY service_name
                    ORDER BY cost DESC
                `;
                params = [dbUserId, monthYear];
            } else {
                query = `
                    SELECT 
                        service_name,
                        SUM(cost_amount) as cost
                    FROM cost_records 
                    WHERE TO_CHAR(date, 'YYYY-MM') = $1
                    GROUP BY service_name
                    ORDER BY cost DESC
                `;
                params = [monthYear];
            }
            
            const result = await this.query(query, params);
            
            // Convert to object format { "EC2": 123.45, "RDS": 67.89 }
            const breakdown = {};
            result.rows.forEach(row => {
                breakdown[row.service_name] = parseFloat(row.cost);
            });
            
            return breakdown;
        } catch (error) {
            console.error('❌ Error getting service breakdown:', error);
            return {};
        }
    }

    // 🆕 Get top trending services (biggest cost changes)
    static async getTopTrendingServices(months = 3, userId = null, limit = 10) {
        try {
            let query, params;
            if (userId) {
                const dbUserId = this.getUserIdForDatabase(userId);
                query = `
                    WITH monthly_service_costs AS (
                        SELECT 
                            service_name,
                            TO_CHAR(date, 'YYYY-MM') as month_year,
                            SUM(cost_amount) as monthly_cost
                        FROM cost_records 
                        WHERE user_id = $1 
                        AND date >= CURRENT_DATE - INTERVAL '1 month' * $2
                        GROUP BY service_name, TO_CHAR(date, 'YYYY-MM')
                    ),
                    service_trends AS (
                        SELECT 
                            service_name,
                            AVG(monthly_cost) as avg_cost,
                            MAX(monthly_cost) as max_cost,
                            MIN(monthly_cost) as min_cost,
                            STDDEV(monthly_cost) as cost_volatility,
                            COUNT(*) as months_active,
                            CASE 
                                WHEN COUNT(*) >= 2 THEN
                                    ROUND(((MAX(monthly_cost) - MIN(monthly_cost)) / NULLIF(MIN(monthly_cost), 0)) * 100, 2)
                                ELSE 0
                            END as growth_rate
                        FROM monthly_service_costs
                        GROUP BY service_name
                    )
                    SELECT * FROM service_trends
                    ORDER BY ABS(growth_rate) DESC, avg_cost DESC
                    LIMIT $3
                `;
                params = [dbUserId, months, limit];
            } else {
                query = `
                    WITH monthly_service_costs AS (
                        SELECT 
                            service_name,
                            TO_CHAR(date, 'YYYY-MM') as month_year,
                            SUM(cost_amount) as monthly_cost
                        FROM cost_records 
                        WHERE date >= CURRENT_DATE - INTERVAL '1 month' * $1
                        GROUP BY service_name, TO_CHAR(date, 'YYYY-MM')
                    ),
                    service_trends AS (
                        SELECT 
                            service_name,
                            AVG(monthly_cost) as avg_cost,
                            MAX(monthly_cost) as max_cost,
                            MIN(monthly_cost) as min_cost,
                            STDDEV(monthly_cost) as cost_volatility,
                            COUNT(*) as months_active,
                            CASE 
                                WHEN COUNT(*) >= 2 THEN
                                    ROUND(((MAX(monthly_cost) - MIN(monthly_cost)) / NULLIF(MIN(monthly_cost), 0)) * 100, 2)
                                ELSE 0
                            END as growth_rate
                        FROM monthly_service_costs
                        GROUP BY service_name
                    )
                    SELECT * FROM service_trends
                    ORDER BY ABS(growth_rate) DESC, avg_cost DESC
                    LIMIT $2
                `;
                params = [months, limit];
            }
            
            const result = await this.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting trending services:', error);
            return [];
        }
    }

    // 🆕 Get cost forecast based on linear regression
    static async getCostForecast(months = 3, userId = null) {
        try {
            const trends = await this.getMonthlyTrends(months, userId);
            
            if (trends.length < 2) {
                return {
                    forecast_available: false,
                    message: 'Need at least 2 months of data for forecasting'
                };
            }
            
            // Simple linear regression
            const costs = trends.map(t => parseFloat(t.total_cost)).reverse();
            const n = costs.length;
            const x = Array.from({ length: n }, (_, i) => i);
            
            const sumX = x.reduce((a, b) => a + b, 0);
            const sumY = costs.reduce((a, b) => a + b, 0);
            const sumXY = x.reduce((sum, xi, i) => sum + xi * costs[i], 0);
            const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // Forecast next 3 months
            const forecasts = [];
            for (let i = 1; i <= 3; i++) {
                const nextValue = slope * (n + i - 1) + intercept;
                forecasts.push({
                    month_offset: i,
                    predicted_cost: Math.max(0, nextValue), // Don't predict negative costs
                    confidence: i === 1 ? 'high' : i === 2 ? 'medium' : 'low'
                });
            }
            
            return {
                forecast_available: true,
                historical_months: n,
                trend_direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
                monthly_change: slope,
                forecasts
            };
        } catch (error) {
            console.error('❌ Error generating forecast:', error);
            return { forecast_available: false, error: error.message };
        }
    }

    static async getServiceTrends(serviceName, days = 30, userId = null) {
        try {
            // 🔒 SECURITY: Filter by user ID if provided
            let query, params;
            
            if (userId) {
                const dbUserId = this.getUserIdForDatabase(userId);
                console.log(`🔒 Filtering service trends by userId: ${dbUserId}, service: ${serviceName}`);
                query = `
                    SELECT 
                        date,
                        service_name,
                        SUM(cost_amount) as cost_amount,
                        COUNT(*) as record_count
                    FROM cost_records 
                    WHERE user_id = $1 
                    AND service_name = $2 
                    AND date >= CURRENT_DATE - INTERVAL '1 day' * $3
                    GROUP BY date, service_name
                    ORDER BY date DESC
                `;
                params = [dbUserId, serviceName, days];
            } else {
                query = `
                    SELECT 
                        date,
                        service_name,
                        SUM(cost_amount) as cost_amount,
                        COUNT(*) as record_count
                    FROM cost_records 
                    WHERE service_name = $1 
                    AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
                    GROUP BY date, service_name
                    ORDER BY date DESC
                `;
                params = [serviceName, days];
            }
            
            const result = await this.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getServiceTrends error:', error);
            return [];
        }
    }

    // NEW: Budget methods
    static async createBudget(budgetData, userId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return null
        if (!pool) {
            console.log('⚠️ Database not available, cannot create budget');
            return null;
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            const query = `
                INSERT INTO budgets (
                    name, amount, period, start_date, end_date, 
                    service_name, region, cost_center, department, project, tags,
                    notification_threshold, user_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const values = [
                budgetData.name,
                budgetData.amount,
                budgetData.period,
                budgetData.startDate,
                budgetData.endDate,
                budgetData.serviceName || null,
                budgetData.region || null,
                budgetData.costCenter || null,
                budgetData.department || null,
                budgetData.project || null,
                budgetData.tags ? JSON.stringify(budgetData.tags) : null,
                budgetData.notificationThreshold || 80.00,
                dbUserId
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Database createBudget error:', error);
            return null;
        }
    }

    static async getBudgets(userId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty budgets');
            return [];
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            const query = `
                SELECT * FROM budgets 
                WHERE user_id = $1 
                ORDER BY created_at DESC
            `;
            const result = await pool.query(query, [dbUserId]);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getBudgets error:', error);
            return [];
        }
    }

    static async getBudget(budgetId, userId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return null
        if (!pool) {
            console.log('⚠️ Database not available, cannot get budget');
            return null;
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            const query = `
                SELECT * FROM budgets 
                WHERE id = $1 AND user_id = $2
            `;
            const result = await pool.query(query, [budgetId, dbUserId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Database getBudget error:', error);
            return null;
        }
    }

    static async updateBudget(budgetId, budgetData, userId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return null
        if (!pool) {
            console.log('⚠️ Database not available, cannot update budget');
            return null;
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            const query = `
                UPDATE budgets SET
                    name = $1, amount = $2, period = $3, start_date = $4, end_date = $5,
                    service_name = $6, region = $7, cost_center = $8, department = $9, project = $10,
                    tags = $11, notification_threshold = $12, updated_at = CURRENT_TIMESTAMP
                WHERE id = $13 AND user_id = $14
                RETURNING *
            `;

            const values = [
                budgetData.name,
                budgetData.amount,
                budgetData.period,
                budgetData.startDate,
                budgetData.endDate,
                budgetData.serviceName || null,
                budgetData.region || null,
                budgetData.costCenter || null,
                budgetData.department || null,
                budgetData.project || null,
                budgetData.tags ? JSON.stringify(budgetData.tags) : null,
                budgetData.notificationThreshold || 80.00,
                budgetId,
                dbUserId
            ];

            const result = await pool.query(query, values);
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Database updateBudget error:', error);
            return null;
        }
    }

    static async deleteBudget(budgetId, userId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return false
        if (!pool) {
            console.log('⚠️ Database not available, cannot delete budget');
            return false;
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            const query = `
                DELETE FROM budgets 
                WHERE id = $1 AND user_id = $2
            `;
            const result = await pool.query(query, [budgetId, dbUserId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Database deleteBudget error:', error);
            return false;
        }
    }

    static async getBudgetAlerts(userId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return empty array
        if (!pool) {
            console.log('⚠️ Database not available, returning empty budget alerts');
            return [];
        }

        try {
            const dbUserId = this.getUserIdForDatabase(userId);

            const query = `
                SELECT ba.*, b.name as budget_name
                FROM budget_alerts ba
                JOIN budgets b ON ba.budget_id = b.id
                WHERE b.user_id = $1
                ORDER BY ba.created_at DESC
            `;
            const result = await pool.query(query, [dbUserId]);
            return result.rows;
        } catch (error) {
            console.error('❌ Database getBudgetAlerts error:', error);
            return [];
        }
    }

    static async createBudgetAlert(alertData) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return null
        if (!pool) {
            console.log('⚠️ Database not available, cannot create budget alert');
            return null;
        }

        try {
            const query = `
                INSERT INTO budget_alerts (
                    budget_id, actual_amount, threshold_amount, percentage, alert_type
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const values = [
                alertData.budgetId,
                alertData.actualAmount,
                alertData.thresholdAmount,
                alertData.percentage,
                alertData.alertType
            ];

            const result = await pool.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Database createBudgetAlert error:', error);
            return null;
        }
    }

    static async markBudgetAlertAsNotified(alertId) {
        // Wait for connection test to complete if it's still pending
        if (connectionTestPromise) {
            await connectionTestPromise;
            connectionTestPromise = null; // Clear the promise after first use
        }

        // If database is not available, return false
        if (!pool) {
            console.log('⚠️ Database not available, cannot mark alert as notified');
            return false;
        }

        try {
            const query = `
                UPDATE budget_alerts 
                SET notified = true, notification_sent_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            const result = await pool.query(query, [alertId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('❌ Database markBudgetAlertAsNotified error:', error);
            return false;
        }
    }
}

module.exports = DatabaseService;